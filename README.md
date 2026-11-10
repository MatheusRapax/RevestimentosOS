# RevestimentosOS

ERP multi-tenant para **lojas de revestimentos** (porcelanato, cerâmica, louças, metais e acabamentos para construção civil). Cobre o ciclo completo de varejo/atacado: catálogo dimensional → orçamento → pedido → reserva e alocação de estoque por lote → compra ao fornecedor → expedição/entrega → financeiro, comissões e emissão de NF-e.

> **Origem:** o sistema nasceu como um ERP para clínicas ("ClinicOS" / "MOA NEXUS") e foi transformado em ERP de revestimentos (ver [`docs/plans/PLAN-erp-revestimentos.md`](docs/plans/PLAN-erp-revestimentos.md)). O núcleo multi-tenant, auth, RBAC e auditoria foi reaproveitado 100%. Restam artefatos com o nome antigo — ver [Legado](#legado-clínico).

---

## Sumário

- [Stack](#stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura em 1 minuto](#arquitetura-em-1-minuto)
- [Módulos de negócio](#módulos-de-negócio)
- [Fluxos automatizados](#fluxos-automatizados)
- [Importação de catálogo (IA + parsers)](#importação-de-catálogo-ia--parsers)
- [Integração fiscal](#integração-fiscal)
- [Scripts](#scripts)
- [Legado clínico](#legado-clínico)
- [Documentação relacionada](#documentação-relacionada)

---

## Stack

### Backend — `/` (porta 3000)

| Camada | Tecnologia |
|---|---|
| Framework | **NestJS 10** + TypeScript 5 |
| ORM / Banco | **Prisma 5** + PostgreSQL 15 |
| Auth | JWT (`@nestjs/jwt` + Passport), Bcrypt |
| IA de importação | `openai` (modelo `gpt-4o-mini`) |
| Documentos | `pdfkit` (PDF de orçamento), `xlsx` (import/export de planilhas), `jsdom` (parse de XML NF-e) |
| Fiscal | `@nestjs/axios` → microserviço externo **NexosFiscal** |

### Frontend — `/clinicos-web` (porta 3001)

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Dados | TanStack Query, Axios (client `/api` via proxy; SSR fala direto com `backend:3000`) |
| Formulários | React Hook Form + Zod |
| UI | TailwindCSS v4, Radix UI / shadcn, `lucide-react`, `sonner` |
| Sessão | `token` e `clinicId` em `localStorage`; enviados como `Authorization: Bearer` e `X-Clinic-Id` |

### Deploy

- **Docker** — `docker-compose.yml` (dev) e `docker-compose.prod.yml` (produção)
- **Coolify + Traefik** (roteamento, health checks, TLS)
- Microserviço fiscal **NexosFiscal** rodando separadamente

---

## Estrutura do repositório

```
RevestimentosOS/
├── src/                       # Backend NestJS
│   ├── main.ts                # bootstrap (CORS, body-parser 50mb, AuditInterceptor global)
│   ├── app.module.ts          # registro de todos os módulos
│   ├── config/                # env.ts (validação de env)
│   ├── core/                  # infraestrutura transversal
│   │   ├── auth/              # JWT, JwtAuthGuard, ModuleGuard, SuperAdminGuard
│   │   ├── tenant/            # TenantGuard + resolução de loja via X-Clinic-Id
│   │   ├── rbac/              # PermissionsGuard, @Permissions, permissions.ts
│   │   ├── audit/             # AuditService + AuditInterceptor (AuditLog)
│   │   ├── stock/             # StockConsumptionService (FIFO compartilhado)
│   │   ├── excel/             # ExcelService (helpers de xlsx)
│   │   └── prisma/            # PrismaService (global)
│   └── modules/               # módulos de negócio (ver seção abaixo)
├── clinicos-web/              # Frontend Next.js
│   └── src/app/dashboard/     # rotas: orcamentos, pedidos, estoque, financeiro, compras…
├── prisma/
│   ├── schema.prisma          # ~65 models
│   ├── migrations/            # ~39 migrations (jan/2026 → ago/2026)
│   ├── seed.ts                # permissões, roles, dados demo
│   └── seed-permissions.ts
├── docs/                      # planos e templates (ver Documentação relacionada)
├── _archive_tests/            # scripts one-off de depuração (não fazem parte da suíte)
├── test/                      # testes e2e (*.e2e-spec.ts)
├── planilhas/                 # amostras de tabelas de fornecedores (git-ignoradas)
└── ARCHITECTURE.md            # arquitetura detalhada
```

---

## Como rodar

### Opção A — Docker (recomendado para dev)

```bash
cp .env.example .env   # e preencha (ver seção abaixo)
docker compose up
```

Sobe PostgreSQL + backend (com `prisma migrate deploy` automático) + frontend. Backend em `http://localhost:3000`, frontend em `http://localhost:3001`.

### Opção B — Local

**Backend** (raiz):

```bash
npm install
cp .env.example .env            # preencha DATABASE_URL, JWT_SECRET, OPENAI_API_KEY…
npm run prisma:migrate          # aplica migrations
npm run prisma:generate         # gera o Prisma Client
npm run seed                    # permissões + roles + dados demo
npm run start:dev               # http://localhost:3000
```

**Frontend** (`clinicos-web/`):

```bash
cd clinicos-web
npm install
cp .env.local.example .env.local   # se existir; senão crie com NEXT_PUBLIC_API_URL
npm run dev                         # http://localhost:3001
```

---

## Variáveis de ambiente

### Backend

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | String de conexão PostgreSQL. A app **não sobe** sem ela. |
| `JWT_SECRET` | ✅ (produção) | Segredo de assinatura do JWT. Com `NODE_ENV=production` a app **não sobe** com ela vazia ou com valor de exemplo (`changeme`); em desenvolvimento só avisa. O `docker-compose.prod.yml` exige a variável. |
| `JWT_EXPIRES_IN` | ⚠️ | Validade do token (default `8h`). |
| `PORT` | | Porta HTTP (default `3000`). |
| `NODE_ENV` | | `development` / `production`. |
| `OPENAI_API_KEY` | | Necessária para o mapeamento de planilhas por IA. Sem ela, o importador por IA fica indisponível (parsers determinísticos continuam funcionando). |
| `FISCAL_MICROSERVICE_URL` | | URL base do microserviço NexosFiscal (ex.: `http://fiscal-api:5000/api/v1`). |
| `FISCAL_MASTER_API_KEY` | | Chave master para provisionar tenants no NexosFiscal (`POST /fiscal/setup`). |
| `FISCAL_API_KEY` | | Chave fiscal usada como fallback quando a loja não tem `nexosApiKey` salva. |
| `FISCAL_WEBHOOK_SECRET` | ✅ (produção) | Segredo HMAC do webhook `POST /fiscal/webhook`. Em produção, sem ele (ou com o valor de exemplo) o webhook é recusado; é o mesmo segredo que o ERP cadastra no NexosFiscal. |
| `FISCAL_WEBHOOK_URL` | ✅ (produção) | Endereço **público** da rota `POST /fiscal/webhook`, como o NexosFiscal a alcança. O ERP cadastra esse endereço no serviço ao enviar o certificado e a cada "Salvar" da Configuração Fiscal. Sem ela, os avisos do serviço não chegam. |
| `FISCAL_ALLOW_PRODUCTION` | | Trava da emissão com valor fiscal: só `true` libera produção (default: bloqueado). Deixe ausente enquanto o fiscal estiver em teste. |
| `FISCAL_RECONCILE_ENABLED` | | `false` desliga a conferência periódica das notas com o serviço fiscal (default: ligada). |
| `FISCAL_RECONCILE_INTERVAL_MS` | | Intervalo da conferência periódica (default `300000`, 5 min). |
| `APP_URL` | | URL pública da API (usada no payload fiscal). |

> **Produção (Coolify):** o contêiner só recebe as variáveis listadas em `environment:` do `docker-compose.prod.yml`.
> Cadastre no Coolify pelo menos `DATABASE_URL`, `JWT_SECRET`, `FISCAL_MASTER_API_KEY`, `FISCAL_MICROSERVICE_URL`,
> `FISCAL_WEBHOOK_SECRET` e `FISCAL_WEBHOOK_URL`. Sem `JWT_SECRET` o deploy falha de propósito.

### Frontend (`clinicos-web/.env.local`)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL da API vista pelo **browser** (em produção normalmente `/api` atrás do proxy). |
| `INTERNAL_API_URL` | URL da API vista pelo **SSR do Next** (rede interna Docker, ex.: `http://backend:3000`). |

---

## Arquitetura em 1 minuto

**Multi-tenancy row-level:** cada registro tem `clinicId` (a "loja"). A loja ativa vem do header **`X-Clinic-Id`** a cada request; o JWT carrega apenas `{ sub, email }`.

**Cadeia de guards** (aplicada por controller — 39 dos 40 controllers):

```
JwtAuthGuard → TenantGuard → PermissionsGuard → (ModuleGuard opcional) → Controller
```

- **`TenantGuard`** resolve/valida a loja (`ClinicUser`), injeta `req.clinicId` e `req.user.activeClinic`. `isSuperAdmin` faz bypass da checagem usuário↔loja.
- **`PermissionsGuard`** + `@Permissions(PERMISSIONS.X)` — RBAC granular (~110 permissões, definidas em [`src/core/rbac/permissions.ts`](src/core/rbac/permissions.ts)).
- **`ModuleGuard`** + `@RequireModules('SALES')` — liga/desliga módulos **por loja** via `Clinic.modules: String[]` (`SALES`, `STOCK`, `FINANCE`, `PURCHASES`, `DELIVERIES`, `RMA`, `PROMOTIONS`, `ARCHITECTS`, `ADMIN`). O frontend usa a mesma lista para montar a sidebar.
- **Auditoria:** `AuditInterceptor` global grava `AuditLog` (ação, entidade, usuário, IP).

**Dinheiro:** sempre `Int` em centavos (`*Cents`). Exceções legadas em `StockEntryItem`/`StockEntry` usam `Float`.

Detalhes completos em [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Módulos de negócio

`src/modules/` — todos sob a mesma tríade de guards.

### Vendas
| Módulo | Rota base | Responsabilidade |
|---|---|---|
| `customers` | `/customers` | Clientes PF/PJ, endereço, arquiteto indicador, limite de crédito |
| `architects` | `/architects` | Arquitetos parceiros (indicadores) + regra de comissão |
| `quotes` | `/quotes`, `/quotes/templates` | Orçamentos com lógica dimensional (m² → caixas, margem de perda), histórico, PDF, reserva de estoque, conversão em pedido |
| `orders` | `/orders` | Pedidos de venda: máquina de estados dupla (`OrderStatus` + `FulfillmentStatus`), comissões on-the-fly, export Excel |
| `environments` | `/environments` | "Ambientes" (Cozinha, Banheiro…) vinculáveis a itens |
| `promotions` | `/promotions` | Campanhas de desconto por produto e período |
| `commissions` | `/commissions` | Regras escalonadas por meta (`CommissionRule` + `CommissionTier`), SELLER/ARCHITECT |

### Estoque e catálogo
| Módulo | Rota base | Responsabilidade |
|---|---|---|
| `catalogue` | `/catalogue/{brands,categories}` | Marcas e categorias, cada uma com markup padrão |
| `stock` | `/stock`, `/stock/entries`, `/stock/exits`, `/stock/products/import` | Produtos (campos dimensionais + fiscais), lotes com tonalidade/calibre, movimentações FIFO, entrada de nota (com bloco fiscal NF-e), saída/requisição, importação de catálogo. Custo do produto por **custo médio ponderado móvel** na confirmação de entrada — ver [`docs/CUSTO-MEDIO-ESTOQUE.md`](docs/CUSTO-MEDIO-ESTOQUE.md). Filtro de disponibilidade (`status=available|in_stock|low_stock|out_of_stock`, estoque menos reservas, aplicado no banco) — ver [`docs/FILTRO-COM-ESTOQUE.md`](docs/FILTRO-COM-ESTOQUE.md) |
| `stock-reservations` | `/stock-reservations` | Reserva de estoque por lote (`ACTIVE`/`CONSUMED`/`EXPIRED`/`CANCELLED`) |
| `occurrences` | `/occurrences` | RMA / gestão de avarias (recebimento, entrega, defeito de fabricação) |

### Compras
| Módulo | Rota base | Responsabilidade |
|---|---|---|
| `suppliers` | `/suppliers` | Fornecedores + cache de mapeamento de planilha por IA |
| `purchase-orders` | `/purchase-orders` | Pedidos de compra, recebimento parcial, vínculo a pedido de venda (cross-docking) |

### Entrega / fiscal / financeiro
| Módulo | Rota base | Responsabilidade |
|---|---|---|
| `deliveries` | `/deliveries` | Agendamento e rastreio de entregas (1:1 com pedido) |
| `fiscal` | `/fiscal` | Emissão de NF-e/NFC-e via NexosFiscal, config por loja, webhook |
| `finance` | `/finance` | Conta-corrente do cliente, cobranças, pagamentos (PIX/cartão/dinheiro/boleto), boletos (`Invoice`), relatórios de receita e valorização de estoque, notas de serviço tomadas |
| `expenses` | `/expenses` | Contas a pagar (fornecedor, operacional, tributos, comissão) |
| `store-settings` | — | Config da loja (taxa de entrega padrão) |
| `dashboard` | `/dashboard` | Widgets configuráveis por usuário: alertas de estoque, contas a vencer, pedidos pendentes, receita do dia, entregas, RMA, performance de vendedores/arquitetos |
| `notices` | `/notices` | Avisos internos da loja |

### Administração
`admin` (`/admin` — super admin: tenants, usuários, stats, cache de mapeamento), `roles` (`/roles`), `clinics` (`/clinics` — a "loja"), `professionals` (usuários da loja), `audit` (`/audit-logs`), `health` (`/health`, sem guards).

---

## Fluxos automatizados

| Gatilho | Efeito |
|---|---|
| **Orçamento aprovado → `POST /quotes/:id/convert`** | Em transação: `Quote.status = CONVERTIDO`, cria `Order` copiando itens/valores, **transfere as `StockReservation`** do orçamento para o pedido (casa por `productId` + `lotId`) |
| **Pedido marcado `PAGO`** | `StockAllocationService.autoAllocateOrder`: reserva estoque aplicando **regra de integridade de lote** (um único lote por item); ajusta `fulfillmentStatus` (`IN_PICKING` / `PARTIALLY_FULFILLED` / `AWAITING_PICKING` / `AWAITING_STOCK`) e `OrderStatus` (`MATERIAL_RECEBIDO` / `AGUARDANDO_CHEGADA` / `AGUARDANDO_MATERIAL`). Também dispara `financeService.registerPayment` (cria `Payment` + `Transaction`) |
| **Chegada de material** | `processStockArrival(productIds)` roda a alocação em todos os pedidos pendentes daquele produto (FIFO por `confirmedAt`) |
| **Pedido marcado `ENTREGUE`** | Cria e confirma `StockExit` automático (baixa real de estoque); marca `Quote` vinculado como `CONVERTIDO`; fecha `PurchaseOrder`s vinculados |
| **`POST /fiscal/emit/:orderId`** | Pré-checagem bloqueia se algum produto não tem NCM/CFOP/CST; converte caixas → m² para itens `M2`; POST assíncrono ao NexosFiscal; resultado final chega via `POST /fiscal/webhook` |

> ⚠️ Reservas de estoque têm `expiresAt` (30 dias) mas a expiração (`expireOldReservations`) **não tem job agendado** — precisa ser chamada manualmente.

---

## Importação de catálogo (IA + parsers)

Módulo `stock`, rotas `POST /stock/products/import/{template,parse,extract-sheets,ai-map,ai-classify,execute}`.

**Caminho A — parsers determinísticos por fornecedor** ([`product-import.service.ts`](src/modules/stock/services/product-import.service.ts)): `standard` (template oficial de 16+ colunas, baixável em `GET /stock/products/import/template`), `structured`, `pierini`, `lexxa`, `mosaicGroup`, `dueFratelli`, `glam`, `dexco`, `strufaldi`.

**Caminho B — mapeamento por IA** ([`ai-import.service.ts`](src/modules/stock/services/ai-import.service.ts)):
1. `flattenExcelToJSON` — desmescla células, **detecta layout multi-seção** (mini-tabelas separadas por títulos), normaliza em uma tabela plana injetando `_sectionFormat`
2. `detectHeaders` — heurística de keywords + penalidade para linhas numéricas
3. `callOpenAIMapping` — `gpt-4o-mini`, `temperature: 0`, JSON schema estrito. Regras de domínio no prompt: cerâmica = m², metal/louça = unidade; nunca mapear "m²/Cx" como custo; ≥2 colunas de preço → **ambiguidade `MULTIPLE_PRICES`** para o usuário resolver; EAN vs SKU; etc.
4. Resultado é cacheado em `SupplierMappingCache` por `supplierId + hash(colunas)` (detecta "schema drift" da planilha)
5. `applyMapping` (local, sem tokens) + `generateImportResult` (calcula custo da caixa = `preço_m² × m²/caixa`, sanitiza número BR `1.234,56`)

Também há importação de **XML de NF-e** para dar entrada de estoque (`stock-entry.service.confirmEntry` + `clinicos-web/src/lib/nfe-parser.ts`).

---

## Integração fiscal

Emissão de NF-e/NFC-e delegada ao microserviço **NexosFiscal** ([`fiscal.service.ts`](src/modules/fiscal/services/fiscal.service.ts)):

- `POST /fiscal/setup` — provisiona um tenant no NexosFiscal e faz upload do certificado A1 (`.pfx` + senha). Credenciais salvas em `ClinicFiscalConfig` (`nexosTenantId`, `nexosApiKey`).
- `POST /fiscal/emit/:orderId` — monta o payload a partir do pedido. **Alíquotas ICMS 18% / PIS 1,65% / COFINS 7,6% estão hardcoded** no serviço.
- `POST /fiscal/webhook` — recebe `NFeAuthorized` / `NFeRejected` / `NFeCanceled` e atualiza o `FiscalDocument` (status, chave, `xmlUrl`, `danfeUrl`).

---

## Scripts

### Backend (raiz)

| Script | Descrição |
|---|---|
| `npm run start:dev` | Dev com watch |
| `npm run start:prod` | Produção (`node dist/main`) |
| `npm run build` | `nest build` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:studio` | Abre o Prisma Studio |
| `npm run seed` | `prisma/seed.ts` (permissões, roles, demo) |
| `npm test` / `npm run test:cov` | Jest (unit + e2e) |

### Frontend (`clinicos-web/`)

| Script | Descrição |
|---|---|
| `npm run dev` | `next dev -p 3001` |
| `npm run build` / `npm start` | Build / serve produção |
| `npm run release` | `standard-version` — versiona backend + frontend juntos e atualiza `src/data/latest-release.json` |

---

## Legado clínico

O sistema foi construído **ao lado** da base de clínicas, não por cima dela. Isso ainda é visível:

- **Naming:** `package.json` chama-se `clinicos`; o model raiz do schema é `Clinic` (= loja); o header é `X-Clinic-Id`; a pasta do frontend é `clinicos-web`. `README.md`/`ARCHITECTURE.md` foram reescritos, mas o restante é caro de renomear (39 migrations).
- **Módulos clínicos ainda carregados** no `AppModule` e com rotas ativas, embora sem uso no negócio de revestimentos: `patients`, `scheduling` (`/appointments`), `encounters`, `encounter-items`, `procedures`, `professionals` (parcialmente reaproveitado), `specialties`. Models correspondentes (`Patient`, `Appointment`, `Encounter`, `EncounterNote` SOAP, `Procedure`, `ConsumableUsage`, `ScheduleBlock`, `ClinicWorkingHours`…) continuam no schema.
- `StockMovement.encounterId` está marcado `DEPRECATED` no schema.
- No frontend ainda existem as rotas `/dashboard/pacientes`, `/dashboard/atendimentos`, `/dashboard/agenda`.

Ver dívidas técnicas completas na análise de contexto / seção correspondente do `ARCHITECTURE.md`.

---

## Documentação relacionada

| Arquivo | Conteúdo |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Arquitetura detalhada: camadas, guards, modelo de dados, fluxos, dívida técnica |
| [`docs/FUNCIONALIDADES-E-SEGURANCA.md`](docs/FUNCIONALIDADES-E-SEGURANCA.md) | Inventário vivo de tudo que o sistema faz e protege (base da apresentação) |
| [`docs/FISCAL-CONTRATO-NEXOSFISCAL.md`](docs/FISCAL-CONTRATO-NEXOSFISCAL.md) | Contrato com o NexosFiscal: emissão, webhook, certificado, ambiente e variáveis |
| [`docs/FISCAL-PENDENCIAS.md`](docs/FISCAL-PENDENCIAS.md) | O que falta antes de emitir nota com valor fiscal |
| [`docs/PERMISSOES.md`](docs/PERMISSOES.md) | Permissões: o que cada uma libera e onde é conferida |
| [`docs/VISIBILIDADE-DAS-VENDAS.md`](docs/VISIBILIDADE-DAS-VENDAS.md) | Cada vendedor vê só as suas vendas |
| [`docs/TRANSFERENCIA-DE-VENDAS.md`](docs/TRANSFERENCIA-DE-VENDAS.md) | Transferir orçamentos e pedidos entre vendedores |
| [`docs/FILTRO-COM-ESTOQUE.md`](docs/FILTRO-COM-ESTOQUE.md) | Filtro “com estoque” no Estoque e no Catálogo de Vendas |
| [`docs/CUSTO-MEDIO-ESTOQUE.md`](docs/CUSTO-MEDIO-ESTOQUE.md) | Custo médio ponderado do estoque |
| [`docs/plans/PLAN-erp-revestimentos.md`](docs/plans/PLAN-erp-revestimentos.md) | Plano original da transformação ClinicOS → RevestimentosOS (Fases 1-5) |
| [`docs/plans/PLAN-ambiente-orcamentos.md`](docs/plans/PLAN-ambiente-orcamentos.md) | Feature de "Ambientes" nos orçamentos |
| [`docs/plans/PLAN-super-admin.md`](docs/plans/PLAN-super-admin.md) | Painel super admin (multi-loja) |
| [`docs/plans/COMPONENT_PLAN_BOLETOS.md`](docs/plans/COMPONENT_PLAN_BOLETOS.md) | Boletos (desativado/futuro) |
| [`docs/plans/COMPONENT_PLAN_REPORTS.md`](docs/plans/COMPONENT_PLAN_REPORTS.md) | Relatórios |
| [`docs/PLAN-gestao-avarias.md`](docs/PLAN-gestao-avarias.md) | RMA / gestão de avarias |
| [`docs/PLAN-rma-order-sync.md`](docs/PLAN-rma-order-sync.md) | Sincronização RMA ↔ pedido |

---

## Licença

UNLICENSED — projeto privado.
