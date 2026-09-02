# RevestimentosOS — Arquitetura do Sistema

> ERP multi-tenant para lojas de revestimentos. Backend NestJS + Prisma/PostgreSQL, frontend Next.js.
> Para setup e visão geral, ver [`README.md`](README.md).

**Última atualização:** 2026-09-02

---

## Sumário

1. [Visão geral e identidade](#1-visão-geral-e-identidade)
2. [Camadas e princípios](#2-camadas-e-princípios)
3. [Multi-tenancy](#3-multi-tenancy)
4. [Autenticação e autorização (guards)](#4-autenticação-e-autorização-guards)
5. [Módulos por domínio](#5-módulos-por-domínio)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Fluxos de negócio automatizados](#7-fluxos-de-negócio-automatizados)
8. [Motor de importação de catálogo](#8-motor-de-importação-de-catálogo)
9. [Integração fiscal](#9-integração-fiscal)
10. [Frontend](#10-frontend)
11. [Deploy](#11-deploy)
12. [Convenções](#12-convenções)
13. [Dívida técnica e pontos de atenção](#13-dívida-técnica-e-pontos-de-atenção)

---

## 1. Visão geral e identidade

| Aspecto | Situação |
|---|---|
| **Origem** | Fork do `ClinicOS` / "MOA NEXUS" — ERP multi-tenant para clínicas |
| **Hoje** | ERP para lojas de revestimentos (porcelanato, cerâmica, louças, metais) |
| **Transformação** | [`docs/plans/PLAN-erp-revestimentos.md`](docs/plans/PLAN-erp-revestimentos.md) — Fases 1-5 "implementado" |
| **Estratégia** | O domínio de vendas (`Customer`/`Quote`/`Order`) foi construído **ao lado** do domínio clínico, que foi mantido como base e ocultado — não removido |
| **Versão** | Backend e frontend versionados juntos via `standard-version` (`npm run release` no frontend) |

O tenant chama-se **`Clinic`** no schema (representa a **loja**); o header de contexto é **`X-Clinic-Id`**; a pasta do frontend é `clinicos-web`; o `package.json` chama-se `clinicos`. Ver [§13](#13-dívida-técnica-e-pontos-de-atenção).

---

## 2. Camadas e princípios

```
┌───────────────────────────────────────────────┐
│  Presentation — Controllers, DTOs, Guards      │  src/modules/*/*.controller.ts
├───────────────────────────────────────────────┤
│  Application — Services / regras de negócio    │  src/modules/*/*.service.ts
├───────────────────────────────────────────────┤
│  Infra — Prisma, OpenAI, HTTP (NexosFiscal),   │  src/core/prisma, ai-import.service,
│          pdfkit, xlsx, filesystem (uploads)    │  fiscal.service, quote-pdf.service
└───────────────────────────────────────────────┘
```

- **Modular por bounded context** — cada pasta em `src/modules/` é um `@Module` NestJS autocontido (controller + service + DTOs).
- **`src/core/`** — infraestrutura transversal, injetável em qualquer módulo: `prisma` (global), `auth`, `tenant`, `rbac`, `audit`, `stock` (FIFO compartilhado), `excel`.
- **DI em tudo** — services recebem `PrismaService`, `AuditService`, etc. via construtor.
- **Validação global** — `ValidationPipe` com `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` ([`src/main.ts`](src/main.ts)).
- **Body parser 50 MB** — para payloads grandes de importação; `rawBody` preservado para o webhook fiscal.

---

## 3. Multi-tenancy

**Estratégia: row-level.** Todo model de negócio tem `clinicId`; um único banco serve todas as lojas.

### Resolução do tenant ([`src/core/tenant/`](src/core/tenant/))

1. `TenantService.resolveClinicId(req)` — lê `req.user.clinicId` (nunca presente hoje) **ou** o header `X-Clinic-Id`.
2. `TenantGuard` valida:
   - **super admin** (`req.user.isSuperAdmin`) → busca a loja direto, sem checar vínculo;
   - **usuário comum** → `ClinicUser` onde `userId + clinicId` e `clinic.isActive`.
3. Injeta `req.clinicId` (string) e `req.user.activeClinic` (objeto `Clinic` completo, incl. `modules`).
4. Rotas `@Public()` pulam o guard.

> **Guard, não middleware:** middleware roda antes dos guards, então não teria `req.user` (populado pelo `JwtAuthGuard`). A ordem `JwtAuthGuard → TenantGuard` é obrigatória.

### Isolamento

Cada service filtra manualmente por `clinicId` em toda query (`where: { clinicId }` ou `where: { id, clinicId }`). **Não há** middleware Prisma nem RLS no Postgres forçando isso — é responsabilidade de cada método.

---

## 4. Autenticação e autorização (guards)

### JWT

- Payload **mínimo**: `{ sub: userId, email }`. Não carrega loja nem roles.
- `login`/`register` retornam `access_token` + `user` + `clinics[]` (cada loja já com `role` e `permissions[]` resolvidos) — [`auth.service.ts`](src/core/auth/auth.service.ts).
- Senhas: bcrypt, 10 rounds.

### Cadeia de guards

Aplicada **por controller** via `@UseGuards(...)` — 39 dos 40 controllers (exceção: `health`). Não há `APP_GUARD` global.

```
JwtAuthGuard        valida o token, popula req.user
      ↓
TenantGuard         resolve/valida a loja, popula req.clinicId e req.user.activeClinic
      ↓
PermissionsGuard    checa @Permissions(...) contra o Role do ClinicUser (lógica AND)
      ↓
ModuleGuard         (opcional) checa @RequireModules(...) contra Clinic.modules[]
      ↓
Controller
```

### RBAC ([`src/core/rbac/`](src/core/rbac/))

- `PERMISSIONS` — ~110 chaves em [`permissions.ts`](src/core/rbac/permissions.ts). **Convenção inconsistente**: a maioria é `dot.case` (`quote.create`), algumas são `SCREAMING_SNAKE` (`PROFESSIONAL_READ`, `CLINIC_ADMIN`).
- `@Permissions(PERMISSIONS.QUOTE_CREATE)` no handler; `PermissionsGuard` exige **todas** as permissões declaradas.
- Roles e mapeamentos: seed em [`prisma/seed.ts`](prisma/seed.ts) + [`prisma/seed-permissions.ts`](prisma/seed-permissions.ts). Papéis sugeridos no plano: `SELLER`, `MANAGER`, `STOCK_MANAGER`, `ADMIN`.

### ModuleGuard — feature flags por loja

`Clinic.modules: String[]` liga/desliga áreas inteiras por loja. Valores usados: `SALES`, `STOCK`, `FINANCE`, `PURCHASES`, `DELIVERIES`, `RMA`, `PROMOTIONS`, `ARCHITECTS`, `ADMIN`. O frontend ([`clinicos-web/src/components/layout/sidebar.tsx`](clinicos-web/src/components/layout/sidebar.tsx)) usa a mesma lista + a permissão para decidir cada item do menu.

### Auditoria ([`src/core/audit/`](src/core/audit/))

`AuditInterceptor` registrado globalmente em `main.ts`. Grava `AuditLog` (`action`, `entity`, `entityId`, `message`, `ip`, `userAgent`, `details` Json). Services também chamam `auditService.log(...)` explicitamente em operações sensíveis.

---

## 5. Módulos por domínio

`src/modules/` — 40 controllers. Todos sob a tríade de guards.

### 5.1 Vendas

| Módulo | Destaques de lógica |
|---|---|
| **`quotes`** | `processQuoteItem`: `inputArea` (m²) → aplica `marginPercent` (margem de perda) → `areaWithMargin` → `quantityBoxes = ceil(area / boxCoverage)` → `resultingArea`. Estados: `EM_ORCAMENTO → AGUARDANDO_APROVACAO → APROVADO → CONVERTIDO` (+ `REJEITADO`/`EXPIRADO`). `QuoteHistory` registra cada transição. Só edita/adiciona item em `EM_ORCAMENTO`. `reserveStock` (greedy por lote ou `preferredLotId`), `duplicateQuote` (repreça com preço atual), PDF via `QuotePdfService` + `QuoteTemplate`. |
| **`orders`** | **Dois eixos de status**: `OrderStatus` (14 valores de negócio) e `FulfillmentStatus` (9 valores logísticos). `updateStatus` orquestra: cancelamento (libera reservas), auto-pagamento (`financeService.registerPayment`, aceita split), auto-alocação, auto-saída de estoque na entrega, fechamento de quote/PO vinculados. `calculateOrderCommissions` calcula comissão de vendedor e arquiteto **on-the-fly** (nada persiste). `swapReservationLot`, `exportToExcel`. |
| **`customers`** | PF/PJ, `stateRegistration`, endereço completo, `architectId`, `creditLimitCents`. `GET /customers/:id/summary`. Reaproveita `PatientAccount` para conta-corrente. |
| **`architects`** | Indicadores parceiros; `commissionRuleId` próprio. `GET /architects/:id/commissions`. |
| **`commissions`** | `CommissionRule` (`targetType` SELLER/ARCHITECT, `goalPeriod`, `isGlobal` — uma global por tipo) + `CommissionTier` (`minGoalAmount` → `commissionRate`). `resolveRule` faz fallback regra específica → global. |
| **`environments`** | "Ambientes" (Cozinha, Banheiro…) `@@unique([clinicId, name])`, vinculável a `QuoteItem`/`OrderItem`. |
| **`promotions`** | `discountPercent` + janela de datas; `GET /promotions/active`. |

### 5.2 Estoque e catálogo

| Módulo | Destaques |
|---|---|
| **`catalogue`** | `brands` + `categories`, cada uma com `defaultMarkup`. **`PricingService`**: hierarquia de markup `produto → marca → categoria → global`; `price = round(cost * (1 + markup/100))`. ⚠️ ramo `manualPrice` retorna `priceCents: 0` (incompleto). |
| **`stock`** | O maior módulo. `stock.service` (CRUD produto, `addStock`/`removeStock` FIFO, `adjustStock`, alertas de estoque baixo / vencimento / tonalidade-calibre, `importParsedProducts`). `stock-entry.service` (~925 linhas: entrada de nota com bloco fiscal NF-e completo; `createDraft → addItem → confirmEntry` efetiva estoque e cria lotes; `createFromPurchaseOrder`). `stock-exit.service` (`createFromOrder` + `confirmExit`). `stock-allocation.service` (auto-alocação — ver [§7](#7-fluxos-de-negócio-automatizados)). Importação: `product-import.service` (parsers) + `ai-import.service` (IA) — ver [§8](#8-motor-de-importação-de-catálogo). |
| **`stock-reservations`** | Reserva por lote; valida `quantity ≤ (lot.quantity − reservado ativo)`; `expiresAt` = +30 dias. `expireOldReservations` existe mas **sem cron**. |
| **`occurrences`** | RMA. `OccurrenceType` RECEBIMENTO/ENTREGA/DEFEITO; `OccurrenceStatus` RASCUNHO→REPORTADO→AGUARDANDO_FORNECEDOR→RESOLVIDO→REEMBOLSADO. Vincula opcionalmente a supplier/customer/order/PO/stockEntry. ⚠️ `Occurrence.number` usa `autoincrement()` **global** (os demais docs usam sequencial por loja). |

### 5.3 Compras

| Módulo | Destaques |
|---|---|
| **`suppliers`** | `@@unique([clinicId, cnpj])`. Relaciona `products`, `purchaseOrders`, `occurrences`, `mappingCaches`. |
| **`purchase-orders`** | `PurchaseOrderStatus` DRAFT→SENT→CONFIRMED→PARTIAL→RECEIVED. `salesOrderId` para compra atrelada a uma venda (cross-docking). `PurchaseOrderItem` guarda `quantityOrdered`/`quantityReceived` e pode não ter `productId` (produto ainda não cadastrado). |

### 5.4 Entrega / fiscal / financeiro

| Módulo | Destaques |
|---|---|
| **`deliveries`** | 1:1 com `Order`. `DeliveryStatus` próprio (PENDING→SCHEDULED→IN_TRANSIT→DELIVERED / FAILED / CANCELED); motorista, placa, `trackingCode`. |
| **`fiscal`** | Ver [§9](#9-integração-fiscal). |
| **`finance`** | `PatientAccount` (conta-corrente, serve `patientId` **e** `customerId`), `Transaction` (`CHARGE`/`PAYMENT`/`REFUND`/`ADJUSTMENT`/`FISCAL_*`), `Payment` (método, parcelas, `gatewayData`). `Invoice` (boletos — **desativado/futuro**, campos p/ ASAAS/IUGU). Relatórios: `getRevenueReport`, `getInventoryValuation`. Notas de serviço tomadas (`Expense.isServiceInvoice`). |
| **`expenses`** | Contas a pagar. `ExpenseType` SUPPLIER/OPERATIONAL/TAX/COMMISSION/OTHER; `ExpenseStatus` PENDING/PAID/OVERDUE/CANCELLED. Links opcionais a `purchaseOrder`/`stockEntry`. |
| **`store-settings`** | 1:1 com `Clinic`; `defaultDeliveryFee`. |
| **`dashboard`** | `UserDashboardConfig` (widgets + atalhos por usuário/loja). Widgets: aniversários, alertas de estoque, contas a vencer, pedidos pendentes, receita do dia, entregas pendentes, alertas RMA, performance de vendedores/arquitetos. |
| **`notices`** | Avisos internos (`priority`, `expiresAt`). |

### 5.5 Administração

`admin` (super admin: `/admin/tenants`, `/admin/users`, `/admin/stats`, `/admin/mapping-caches`), `roles`, `clinics` (a loja: `slug`, `logoUrl`, `modules[]`, `globalMarkup`), `professionals` (usuários da loja + working hours), `audit` (`/audit-logs`), `health`.

### 5.6 Legado clínico (carregado, sem uso no negócio)

`patients`, `scheduling` (`/appointments`, blocos, working hours), `encounters` (+ SOAP `EncounterNote`, anexos, relatório PDF), `encounter-items`, `procedures`, `specialties`. Ainda no `AppModule` e com rotas ativas.

---

## 6. Modelo de dados

[`prisma/schema.prisma`](prisma/schema.prisma) — ~65 models, ~39 migrations. PostgreSQL. IDs `uuid`. Dinheiro em `Int` centavos (sufixo `*Cents`).

### 6.1 Núcleo / tenant / RBAC

`User` (+ `isSuperAdmin`, `commissionRuleId`) · **`Clinic`** (= loja) · `ClinicUser` (pivot user↔loja↔role, `@@unique([clinicId, userId])`, `color` de calendário) · `Role` / `Permission` / `RolePermission` · `AuditLog` · `UserDashboardConfig` · `StoreSettings`.

### 6.2 Catálogo e precificação

**`Product`** — o model mais rico:

| Grupo | Campos |
|---|---|
| Base | `sku`, `barcode`, `unit`, `costCents`, `priceCents`, `minStock`, `isActive` |
| Precificação | `categoryId`, `brandId`, `markup` (override), `manualPrice`, `isAdhoc` (produto avulso de um orçamento) |
| Dimensional revestimentos | `saleType` (`UNIT`/`AREA`/`BOTH`), `boxCoverage` (m²/caixa), `piecesPerBox`, `boxWeight`, `palletBoxes`, `palletWeight`, `palletCoverage` |
| Dimensional louças/metais | `height`, `width`, `depth`, `color` |
| Padronização | `format` ("60x60"), `usage` ("Piso"/"Parede"), `line` (coleção), `supplierId`, `supplierCode` |
| Fiscal | `ncm`, `cest`, `cfop`, `cst`, `origin`, `mva`, `taxClass` |

`Category` / `Brand` — `@@unique([clinicId, name])`, cada uma com `defaultMarkup`.
`Promotion` / `PromotionProduct` (join). `Environment`.

### 6.3 Estoque

- **`StockLot`** — `lotNumber`, `quantity`, `expirationDate`, **`shade` (tonalidade)**, **`caliber` (calibre)**. `@@unique([clinicId, productId, lotNumber])`.
- **`StockMovement`** — `type` `IN`/`OUT`/`ADJUST`/`AVARIA`; links `order`/`purchaseOrder`/`stockEntry`/`stockExit`/`occurrence` (+ `encounterId` **DEPRECATED**); metadados `batchId`, `destinationType/Name`, `invoiceNumber`, `supplier`.
- **`StockEntry`** / `StockEntryItem` — entrada de nota. Bloco fiscal NF-e completo: `accessKey` (44 díg.), bases/valores ICMS/ICMS-ST/IPI (centavos), transporte (`freightType`, transportador, placa), volumes (peso bruto/líquido), `installmentsData` (Json — duplicatas parseadas do XML até a confirmação). Status `DRAFT → CONFIRMED → CANCELED`; `EntryType` INVOICE/MANUAL/DONATION/RETURN. ⚠️ `unitCost`/`totalCost`/`totalValue` são `Float` legados.
- **`StockExit`** / `StockExitItem` — `ExitType` SECTOR_REQUEST/PATIENT_USE/DISCARD/EXPIRY/ADJUSTMENT/SALE.
- **`StockReservation`** — `ReservationStatus` ACTIVE/CONSUMED/EXPIRED/CANCELLED; `ReservationType` ORCAMENTO/PEDIDO; refs a `order`/`orderItem`/`quote`/`quoteItem`/`lot`/`product`.
- **`SupplierMappingCache`** — `@@unique([supplierId, headersHash])`; `mappingPayload` (Json string), `confidenceScore`.

### 6.4 Vendas

`Customer` · `Architect` · `QuoteTemplate` (branding/dados bancários/termos do PDF) ·
**`Quote`** (`@@unique([clinicId, number])`; `subtotalCents`/`discountCents`/`discountPercent`/`globalMarginPercent`/`deliveryFee`/`totalCents`; `notes` vs `internalNotes`) · **`QuoteItem`** (`sequence` p/ reordenação; `inputArea`→`areaWithMargin`→`quantityBoxes`→`resultingArea`; `preferredLotId`, `environmentId`) · `QuoteHistory` ·
**`Order`** (`@@unique([clinicId, number])`; `quoteId` unique opcional; `status: OrderStatus`, `fulfillmentStatus: FulfillmentStatus`) · **`OrderItem`** (espelha `QuoteItem` + `lotId` + `status` de entrega parcial).

### 6.5 Compras / entrega / fiscal / financeiro

`Supplier` · `PurchaseOrder` / `PurchaseOrderItem` · `Delivery` · `Invoice` (boleto) · `FiscalDocument` (`FiscalStatus`, `FiscalType` NFE/NFCE, `key`, `xmlUrl`, `danfeUrl`) · `ClinicFiscalConfig` (1:1 loja; credenciais NexosFiscal + defaults NCM/CFOP/CST/natureza) · `Expense` · `PatientAccount` · `Transaction` · `Payment` · `CommissionRule` / `CommissionTier`.

### 6.6 RMA

`Occurrence` / `OccurrenceItem` (`unitType` "CAIXA"/"UNIDADE").

### 6.7 Legado clínico (ativo no schema)

`Patient`, `Appointment`, `Encounter`, `RecordEntry`, `EncounterNote` (SOAP), `EncounterAttachment`, `ProcedurePerformed`, `ConsumableUsage`, `Procedure`, `ProcedureConsumable`, `Specialty`, `ProfessionalWorkingHours`, `ScheduleBlock`, `ClinicWorkingHours`.

### 6.8 Enums-chave

`OrderStatus` (CRIADO, RASCUNHO, AGUARDANDO_PAGAMENTO, PAGO, AGUARDANDO_COMPRA, AGUARDANDO_CHEGADA, AGUARDANDO_REPOSICAO, MATERIAL_RECEBIDO, AGUARDANDO_MATERIAL `//deprecated`, EM_SEPARACAO, PRONTO_PARA_RETIRA, PRONTO_PARA_ENTREGA `//deprecated`, SAIU_PARA_ENTREGA, ENTREGUE, CANCELADO) · `FulfillmentStatus` (PENDING, AWAITING_STOCK, AWAITING_PICKING, IN_PICKING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, RETURNED, PARTIALLY_FULFILLED) · `QuoteStatus` · `SaleType` (UNIT/AREA/BOTH) · `CustomerType` (PF/PJ) · `TransactionType` · `PaymentMethod` (PIX/CREDIT_CARD/DEBIT_CARD/CASH/BOLETO/TRANSFER) · `StockMovementType` (IN/OUT/ADJUST/AVARIA).

---

## 7. Fluxos de negócio automatizados

### 7.1 Orçamento → Pedido — `quotes.service.convertToOrder`

Só se `Quote.status === APROVADO`. Em `$transaction`:
1. `Quote.status = CONVERTIDO` (+ `QuoteHistory`).
2. Cria `Order` (`number` sequencial por loja) copiando itens e valores.
3. **Transfere `StockReservation`**: para cada reserva `ACTIVE` do quote, acha o `OrderItem` correspondente (por `productId`, preferindo match de `lotId`) e reaponta `orderId`/`orderItemId`/`productId`, muda `type` para `PEDIDO`.

### 7.2 Pedido `PAGO` → alocação — `stock-allocation.service.autoAllocateOrder`

Disparado por `orders.updateStatus` quando entra em `PAGO` (fora da transação de status). Para cada item:
- Considera o que já está reservado (agrupado por `productId`, com fallback `lot.productId` p/ dados legados).
- **Regra de integridade de lote**: procura **um único lote** com `quantity ≥ neededQty` (ordenado por `expirationDate asc`, `createdAt asc`). Não fraciona entre lotes automaticamente.
- Cria `StockReservation` (`expiresAt` +30 dias) + `AuditLog`.

Resultado → `fulfillmentStatus`:

| Condição | `fulfillmentStatus` | `OrderStatus` derivado |
|---|---|---|
| Todos os itens reservados | `IN_PICKING` | `MATERIAL_RECEBIDO` |
| Parte reservada | `PARTIALLY_FULFILLED` | — |
| Saldo total existe mas não em lote único | `AWAITING_PICKING` | `AGUARDANDO_CHEGADA` (se há PO ativo) ou `AGUARDANDO_MATERIAL` |
| Sem saldo | `AWAITING_STOCK` | idem |

### 7.3 Chegada de material — `processStockArrival(clinicId, productIds)`

Busca pedidos pendentes que contêm algum desses produtos (status pagos/aguardando + fulfillment aguardando), ordena por `confirmedAt asc` (FIFO por data de pagamento) e roda `autoAllocateOrder` em cada um.

### 7.4 Pedido `ENTREGUE` — `orders.updateStatus`

1. `fulfillmentStatus = DELIVERED`, `deliveredAt = now`.
2. Cria + confirma `StockExit` automático (`createFromOrder` → `confirmExit`) → baixa real de estoque + `StockMovement` OUT.
3. `Quote` vinculado → `CONVERTIDO`.
4. `PurchaseOrder`s vinculados em `SENT`/`CONFIRMED`/`PARTIAL` → `RECEIVED`.

### 7.5 Pedido `PAGO` → financeiro — `finance.service.registerPayment`

Cria `Payment` + `Transaction` na conta-corrente do cliente. Aceita split (`payments[]` com método/valor/parcelas) ou pagamento único pelo `totalCents`.

---

## 8. Motor de importação de catálogo

Módulo `stock`. Controller [`product-import.controller.ts`](src/modules/stock/product-import.controller.ts): `GET template`, `POST parse | extract-sheets | ai-map | ai-classify | execute`, `GET clear-cache`.

### 8.1 Parsers determinísticos — [`product-import.service.ts`](src/modules/stock/services/product-import.service.ts) (~1.356 linhas)

`processFile(buffer, strategy)` → uma de: `standard` (template oficial 16+ colunas, gerado por `generateTemplateBuffer`), `structured`, `pierini`, `lexxa`, `mosaicGroup`, `dueFratelli`, `glam`, `dexco`, `strufaldi`. Cada parser conhece o layout específico da tabela daquele fornecedor. `calcCostCents` converte custo/m² → custo/caixa quando `boxCoverage > 0`.

### 8.2 Mapeamento por IA — [`ai-import.service.ts`](src/modules/stock/services/ai-import.service.ts) (~881 linhas)

| Passo | Função | O que faz |
|---|---|---|
| 1 | `extractSheetNames` / `identifyProductSheets` | Filtra abas não-produto (Instruções, Frete…) |
| 2 | `flattenExcelToJSON` | Desmescla células. `detectSectionedLayout` acha layout multi-seção (≥2 merges horizontais largos). Normaliza mini-tabelas em uma tabela plana injetando `_sectionFormat` por linha; remove cabeçalhos repetidos |
| 3 | `detectHeaders` | Acha a linha de cabeçalho (keywords `ref/código/descrição/ean/formato…` + penalidade p/ linhas numéricas) |
| 4 | `buildAISample` | Monta amostra (10-15 linhas, cobrindo múltiplas seções) |
| 5 | `generateHeadersHash` + `getCachedMapping` | MD5 das colunas normalizadas → busca em `SupplierMappingCache` (evita re-chamar a IA; detecta schema drift) |
| 6 | `callOpenAIMapping` | `gpt-4o-mini`, `temperature: 0`, `response_format: json_schema` estrito. Prompt com regras de domínio: cerâmica=m², metal/louça=UN; **nunca** mapear "m²/Cx" como `cost`; ≥2 colunas de preço → `ambiguities: [{ type: MULTIPLE_PRICES, options }]`; EAN vs SKU (SKU = "Código Fabricante"/"Ref"); Altura/Largura/Prof. ≠ `format` |
| 7 | `saveCachedMapping` | Persiste o mapeamento aprovado |
| 8 | `applyMapping` | Local, sem tokens. `normalizeString` (NFD, lowercase). Suporta campos virtuais `_sectionFormat`/`_category`. Fallback SKU↔EAN |
| 9 | `generateImportResult` | `sanitizeNumber` (formato BR `1.234,56`). Se `unit=M2` e `m2PerBox>0`: `costCents = round(rawCost * m2PerBox * 100)`, `costPerM2Cents = round(rawCost*100)`. Filtro rígido remove cabeçalhos/categorias residuais |

Gestão do cache: `GET/PUT/DELETE /admin/mapping-caches` (super admin) + painel no frontend.

### 8.3 Import de XML de NF-e

`stock-entry.service.confirmEntry` + [`clinicos-web/src/lib/nfe-parser.ts`](clinicos-web/src/lib/nfe-parser.ts) — dá entrada de estoque a partir do XML, incl. duplicatas/parcelas.

---

## 9. Integração fiscal

Microserviço externo **NexosFiscal** ([`fiscal.service.ts`](src/modules/fiscal/services/fiscal.service.ts)).

| Rota | Ação |
|---|---|
| `POST /fiscal/setup` | Cria tenant no NexosFiscal, gera API key, faz upload do certificado A1 (`.pfx` + senha). Salva em `ClinicFiscalConfig` (`nexosTenantId`, `nexosApiKey`, `environment` default `2` = homologação) |
| `POST /fiscal/emit/:orderId` | Pré-checagem: bloqueia se algum produto sem `ncm`/`cfop`/`cst` (retorna `code: MISSING_FISCAL_DATA` + lista). Monta payload: converte caixas→m² p/ itens `M2`; **ICMS 18% / PIS 1,65% / COFINS 7,6% hardcoded**; pagamento `PIX`/`A_VISTA` fixo. POST assíncrono; cria/atualiza `FiscalDocument` como `PROCESSING` |
| `GET/PUT /fiscal/settings` | Config e defaults por loja; indica se as credenciais vêm de `database` ou `env` |
| `POST /fiscal/webhook` | `NFeAuthorized`→`APPROVED`, `NFeRejected`→`REJECTED` (+ motivo), `NFeCanceled`→`CANCELLED`. Atualiza `uuid`/`key`/`xmlUrl`/`danfeUrl` |

Fallback: sem `ClinicFiscalConfig`, usa config transiente do `.env` (`FISCAL_API_KEY`).

---

## 10. Frontend

- **Next.js 16 / React 19**, App Router. Rotas em [`clinicos-web/src/app/dashboard/`](clinicos-web/src/app): `orcamentos`, `pedidos`, `clientes`, `arquitetos`, `estoque` (+ `entradas`, `saidas`, `movimentacoes`, `ocorrencias`, `importacao`, `produtos`), `compras`, `fornecedores`, `financeiro` (+ `contas-a-pagar`, `notas-servico`, `vendedores`, `arquitetos`), `entregas`, `vendas` (`catalogo`, `promocoes`), `configuracoes` (`ambientes`, `comissoes`, `templates`), `admin`.
- **API client** [`src/lib/api.ts`](clinicos-web/src/lib/api.ts): browser → `/api` (proxy); SSR → `INTERNAL_API_URL`. Interceptor injeta `Authorization: Bearer` + `X-Clinic-Id` do `localStorage`; `401` (fora do login) limpa sessão e redireciona.
- **Estado servidor**: TanStack Query. **Auth**: `src/contexts/auth-context.tsx`. **Libs de domínio**: `nfe-parser.ts`, `brasil-api.ts` (CEP/CNPJ), `masks.ts`.
- Rotas legadas ainda presentes: `/dashboard/pacientes`, `/dashboard/atendimentos`, `/dashboard/agenda`.

---

## 11. Deploy

| Ambiente | Arquivo | Notas |
|---|---|---|
| Dev | [`docker-compose.yml`](docker-compose.yml) | Postgres + backend (`prisma migrate deploy` + `start:dev`) + frontend. Volumes montam `src/` p/ hot reload. `host.docker.internal` p/ o fiscal local |
| Produção | [`docker-compose.prod.yml`](docker-compose.prod.yml) | Rede externa `coolify`; labels **Traefik**; health checks (`/health`, `/`); volume `uploads_data` p/ `EncounterAttachment` e afins. `DATABASE_URL` e chaves vêm do Coolify |

`Dockerfile` multi-stage (`builder` / runtime). O histórico git mostra iterativa estabilização de memória (OOM em builds paralelos) e de health checks (IPv6, BusyBox `wget`).

---

## 12. Convenções

- **Dinheiro**: `Int` centavos, sufixo `*Cents`. Novos campos devem seguir isso (não repetir os `Float` legados de `StockEntry*`).
- **Numeração de documentos**: sequencial **por loja** via `findFirst({ where:{clinicId}, orderBy:{number:'desc'} })` + 1. (⚠️ condição de corrida sob concorrência; `Occurrence` foge ao padrão usando `autoincrement()`).
- **Isolamento**: todo método de service filtra por `clinicId` explicitamente.
- **Guards**: `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)` na classe + `@Permissions(...)` no handler. `@RequireModules(...)` quando a área é um módulo comercial opcional.
- **Auditoria**: `auditService.log({ clinicId, userId, action, entity, entityId, message })` após mutações relevantes.
- **DTOs**: `class-validator` + `class-transformer`; o `ValidationPipe` global rejeita campos não declarados.
- **Datas**: `DateTime` no banco; alguns models legados guardam `date`/`time` como string (`YYYY-MM-DD` / `HH:MM`).

---

## 13. Dívida técnica e pontos de atenção

### Legado / naming
1. `package.json` = `clinicos`; model raiz = `Clinic`; header = `X-Clinic-Id`; pasta frontend = `clinicos-web`. Renomear é caro (39 migrations + todo o código) — decisão consciente, mas é ruído permanente.
2. Módulos clínicos inteiros carregados sem uso: `patients`, `scheduling`, `encounters`, `encounter-items`, `procedures`, `specialties`. Aumentam bundle, superfície de API e confusão.
3. `StockMovement.encounterId` marcado `DEPRECATED`.

### Segurança / config
4. `JWT_SECRET` faz fallback para `changeme` com só um `console.warn` ([`env.ts`](src/config/env.ts)) — não aborta em produção.
5. [`main.ts`](src/main.ts) loga **toda request** (método, URL, origin, user-agent) via `console.log`.
6. CORS em `main.ts` fixo em `frontend.moa.software` + `localhost` — não contempla o domínio de revestimentos.
7. O JWT não assina a loja ativa; ela vem do header a cada request. O `TenantGuard` valida acesso, então não há escalonamento — mas a "loja ativa" é totalmente client-driven.

### Modelagem / consistência
8. Dinheiro: `StockEntryItem.unitCost/totalCost` e `StockEntry.totalValue` são `Float` legados (o resto é `Int` centavos).
9. `Occurrence.number` é `autoincrement()` global; os demais documentos usam sequencial por loja (que, por sua vez, tem condição de corrida sob concorrência).
10. `StockReservation` expira só se `expireOldReservations` for chamado — **não há job agendado**.
11. Comissões: `CommissionRule`/`Tier` existem, mas o cálculo (`orders.calculateOrderCommissions`) é efêmero (relatório). Não há entidade que registre a comissão apurada/paga por pedido.
12. `PricingService` ramo `MANUAL` retorna `priceCents: 0` (incompleto — depende do caller não chamar nesse caso).
13. `OrderStatus` e `FulfillmentStatus` se sobrepõem parcialmente e têm valores `// Deprecated` ativos no enum. A máquina de estados do pedido é complexa e vale um diagrama dedicado.
14. `xlsx@0.18.5` (SheetJS via npm) tem CVEs conhecidas (protótipo / ReDoS); usado no backend e no frontend.

### Fiscal
15. Alíquotas ICMS/PIS/COFINS e `codigoMunicipio` (`3550308` = São Paulo) hardcoded em `fiscal.service.emitirNota`.
