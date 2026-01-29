# Planejamento: Transformação ERP Revestimentos

> **Status**: ✅ Implementado (Fases 1-4)  
> **Data**: 28/01/2026  
> **Atualizado**: 28/01/2026  
> **Objetivo**: Transformar o core do "ClinicOS" em um ERP especializado para Lojas de Revestimentos ("RevestimentosOS"), mantendo a arquitetura modular multi-tenant.

---

## 1. Resumo dos Requisitos (Coletados com Cliente)

### Modelo de Negócio
- **Tipo de Operação**: Híbrido (Varejo CPF + Atacado CNPJ, mesmo preço atualmente)
- **Intermediários**: Arquitetos que indicam clientes (relatório de vendas por arquiteto)
- **Fluxo de Vendas**:
  1. **Balcão Direto**: Venda imediata
  2. **Orçamento → Venda**: Arquiteto solicita → Orçamento → Aprovação → Pedido → Entrega
  3. **Venda sem Estoque**: Produtos podem ser vendidos sem estoque físico (pedido ao fornecedor depois)

### Lógica Dimensional (CRÍTICA)
- **Venda por m²/caixas**: Cada produto tem `m² por caixa`, `peso por caixa`, `peças por caixa`
- **Conversão Automática**: Cliente pede 45m² → Sistema calcula 32 caixas (arredonda para cima)
- **Lotes**: Tonalidade/Calibre devem ser considerados (lotes diferentes = aviso)

### Funcionalidades Específicas
- [x] Descontos: Por produto ou total (em R$ ou %) - Schema suporta, UI pendente
- [x] Taxa de entrega no orçamento - Campo `deliveryFee` no Quote
- [x] Importação de tabela de produtos (CSV/Excel) - `/dashboard/estoque/importar`
- [x] Importação de XML de nota fiscal (entrada de estoque automática) - `/dashboard/estoque/importar-nfe`
- [x] Boletos com lembrete de vencimento - **Implementado backend interno, integração externa pendente**
- [x] Templates de orçamento (PDF profissional) - `/quotes/:id/pdf`
- [x] Vender produtos que estão no sistema mas não em estoque - Permitido pelo schema

---

## 2. Análise da Arquitetura Atual

### ✅ Core (Reutilizar 100%)

| Módulo | Localização | Notas |
|--------|-------------|-------|
| **Auth** | `src/core/auth/` | JWT, Passport, Guards - sem alteração |
| **Tenant** | `src/core/tenant/` | Multi-loja via X-Clinic-Id header - sem alteração |
| **RBAC** | `src/core/rbac/` | 37+ permissões existentes - adicionar novas para Sales |
| **Audit** | `src/core/audit/` | Logs de auditoria - sem alteração |
| **Prisma** | `src/core/prisma/` | ORM client - sem alteração |

### ⚠️ Módulos para Adaptar

| Módulo Atual | Adaptação | Esforço |
|--------------|-----------|---------|
| `Patient` | Renomear para `Customer` + campos PJ | Médio |
| `Product` | Adicionar campos dimensionais (m²/caixa, peso) | Médio |
| `StockLot` | Adicionar campos Tonalidade/Calibre | Baixo |
| `Finance` | Adicionar Boletos, Descontos | Médio |

### 🔴 Módulos Clínicos (Desativar/Ocultar)

| Módulo | Ação | Motivo |
|--------|------|--------|
| `Encounter` | Manter código, ocultar no menu | Base para `Sales` |
| `Scheduling` | Manter código, ocultar no menu | Base para `Deliveries` (futuro) |
| `Procedures` | Remover do frontend | Não aplicável |
| `EncounterItems` | Remover do frontend | Substituído por `QuoteItem/OrderItem` |
| `EncounterNote` | Remover do frontend | Não aplicável |

### 🟢 Novos Módulos

| Módulo | Descrição | Prioridade |
|--------|-----------|------------|
| `Sales` (Quote/Order) | Orçamentos e Pedidos de Venda | P0 |
| `Architects` | Gestão de arquitetos parceiros | P1 |
| `PurchaseOrders` | Pedidos ao fornecedor | P2 |
| `Deliveries` | Agendamento de entregas | P2 |

---

## 3. Mapeamento de Permissões RBAC

### Permissões Existentes (a manter)
```typescript
// src/core/rbac/permissions.ts - relevantes
CLINIC_ADMIN, CLINIC_READ, CLINIC_SETTINGS_MANAGE
PATIENT_CREATE, PATIENT_READ, PATIENT_UPDATE, PATIENT_DELETE
STOCK_CREATE, STOCK_READ, STOCK_UPDATE
FINANCE_READ, FINANCE_CHARGE, FINANCE_PAYMENT
AUDIT_READ
```

### Novas Permissões (a criar)
```typescript
// Customers (renomeia de Patient)
CUSTOMER_CREATE, CUSTOMER_READ, CUSTOMER_UPDATE, CUSTOMER_DELETE

// Sales/Quotes
QUOTE_CREATE, QUOTE_READ, QUOTE_UPDATE, QUOTE_CONVERT, QUOTE_DELETE

// Orders
ORDER_CREATE, ORDER_READ, ORDER_UPDATE, ORDER_CANCEL

// Architects
ARCHITECT_READ, ARCHITECT_MANAGE

// Deliveries (futuro)
DELIVERY_CREATE, DELIVERY_READ, DELIVERY_UPDATE
```

### Novos Roles Sugeridos
| Role | Descrição | Permissões Principais |
|------|-----------|----------------------|
| `SELLER` | Vendedor de balcão | Quote, Order, Customer (CRU) |
| `MANAGER` | Gerente da loja | Tudo + Relatórios |
| `STOCK_MANAGER` | Estoquista | Stock, PurchaseOrder |
| `ADMIN` | Administrador | Todas |

---

## 4. Schema Prisma - Alterações Detalhadas

### 4.1 Alterações no Model `Product` (existente)

```prisma
// Adicionar ao model Product existente
enum SaleType {
  UNIT
  AREA
  BOTH
}

model Product {
  // ... campos existentes (name, description, unit, sku, barcode, minStock, costCents, priceCents, isActive)
  
  // NOVOS CAMPOS para Revestimentos
  saleType        SaleType @default(UNIT)
  boxCoverage     Float?   // m² cobertos por caixa (ex: 1.44)
  piecesPerBox    Int?     // peças por caixa (ex: 8)
  boxWeight       Float?   // peso da caixa em kg
  palletBoxes     Int?     // caixas por palete
  
  // Relacionamentos existentes mantidos
  lots            StockLot[]
  movements       StockMovement[]
}
```

### 4.2 Alterações no Model `StockLot` (existente)

```prisma
model StockLot {
  // ... campos existentes (lotNumber, quantity, expirationDate)
  
  // NOVOS CAMPOS para Revestimentos
  shade           String?  // Tonalidade (ex: "A1", "B2")
  caliber         String?  // Calibre (ex: "9mm", "10mm")
  
  // Lotes diferentes devem gerar warning na venda
}
```

### 4.3 Novo Model `Customer` (substituindo Patient)

```prisma
enum CustomerType {
  PF  // Pessoa Física
  PJ  // Pessoa Jurídica
}

model Customer {
  id              String       @id @default(uuid())
  clinicId        String       // Tenant (loja)
  type            CustomerType @default(PF)
  
  // Dados básicos
  name            String
  email           String?
  phone           String?
  document        String?      // CPF ou CNPJ
  stateRegistration String?    // Inscrição Estadual (para PJ)
  
  // Endereço
  address         String?
  city            String?
  state           String?
  zipCode         String?
  
  // Relacionamentos
  architectId     String?      // Arquiteto que indicou
  architect       Architect?   @relation(fields: [architectId], references: [id])
  
  // Financeiro
  creditLimit     Int?         // Limite de crédito em centavos
  
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  clinic          Clinic       @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  quotes          Quote[]
  orders          Order[]
  
  @@index([clinicId])
  @@index([clinicId, name])
  @@index([clinicId, document])
}
```

### 4.4 Novo Model `Architect` (Profissionais Parceiros)

```prisma
model Architect {
  id              String    @id @default(uuid())
  clinicId        String
  name            String
  email           String?
  phone           String?
  document        String?   // CPF
  commissionRate  Float?    // Percentual de comissão (ex: 3.0 = 3%)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  clinic          Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  customers       Customer[]
  quotes          Quote[]
  
  @@index([clinicId])
}
```

### 4.5 Novo Model `Quote` (Orçamento)

```prisma
enum QuoteStatus {
  DRAFT       // Rascunho
  SENT        // Enviado ao cliente
  APPROVED    // Aprovado pelo cliente
  REJECTED    // Recusado
  EXPIRED     // Expirado
  CONVERTED   // Convertido em Pedido
}

model Quote {
  id              String      @id @default(uuid())
  clinicId        String
  number          Int         // Número sequencial do orçamento
  
  // Relacionamentos
  customerId      String
  customer        Customer    @relation(fields: [customerId], references: [id])
  architectId     String?
  architect       Architect?  @relation(fields: [architectId], references: [id])
  sellerId        String      // Usuário que criou
  seller          User        @relation("QuoteSeller", fields: [sellerId], references: [id])
  
  // Status e datas
  status          QuoteStatus @default(DRAFT)
  validUntil      DateTime?   // Data de validade
  sentAt          DateTime?
  approvedAt      DateTime?
  
  // Valores
  subtotalCents   Int         @default(0)
  discountCents   Int         @default(0)  // Desconto total
  discountPercent Float?                   // OU desconto em %
  deliveryFee     Int         @default(0)  // Taxa de entrega
  totalCents      Int         @default(0)
  
  notes           String?     // Observações
  internalNotes   String?     // Notas internas (não vão no PDF)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  clinic          Clinic      @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  items           QuoteItem[]
  order           Order?      // Pedido gerado (se convertido)
  
  @@unique([clinicId, number])
  @@index([clinicId])
  @@index([clinicId, status])
  @@index([customerId])
}
```

### 4.6 Novo Model `QuoteItem` (Item do Orçamento)

```prisma
model QuoteItem {
  id              String    @id @default(uuid())
  quoteId         String
  productId       String
  
  // Quantidades (lógica dimensional)
  inputArea       Float?    // Área informada pelo usuário (m²)
  quantityBoxes   Int       // Quantidade de caixas (calculada ou manual)
  resultingArea   Float?    // Área real (caixas * boxCoverage)
  
  // Preços
  unitPriceCents  Int       // Preço por m² ou por caixa
  discountCents   Int       @default(0)
  discountPercent Float?
  totalCents      Int
  
  // Lote preferido (opcional)
  preferredLotId  String?
  preferredLot    StockLot? @relation(fields: [preferredLotId], references: [id])
  
  notes           String?   // Ex: "Aplicar na área da cozinha"
  
  createdAt       DateTime  @default(now())
  
  quote           Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  product         Product   @relation(fields: [productId], references: [id])
  
  @@index([quoteId])
  @@index([productId])
}
```

### 4.7 Novo Model `Order` (Pedido de Venda)

```prisma
enum OrderStatus {
  PENDING         // Aguardando pagamento/confirmação
  CONFIRMED       // Confirmado
  IN_SEPARATION   // Em separação no estoque
  READY           // Pronto para retirada/entrega
  DELIVERED       // Entregue
  CANCELLED       // Cancelado
}

model Order {
  id              String      @id @default(uuid())
  clinicId        String
  number          Int         // Número sequencial do pedido
  
  // Origem
  quoteId         String?     @unique
  quote           Quote?      @relation(fields: [quoteId], references: [id])
  
  // Relacionamentos
  customerId      String
  customer        Customer    @relation(fields: [customerId], references: [id])
  sellerId        String
  seller          User        @relation("OrderSeller", fields: [sellerId], references: [id])
  
  status          OrderStatus @default(PENDING)
  
  // Valores (copiados do Quote ou recalculados)
  subtotalCents   Int
  discountCents   Int         @default(0)
  deliveryFee     Int         @default(0)
  totalCents      Int
  
  // Entrega
  deliveryAddress String?
  deliveryDate    DateTime?
  deliveredAt     DateTime?
  
  notes           String?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  confirmedAt     DateTime?
  
  clinic          Clinic      @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  items           OrderItem[]
  payments        Payment[]
  stockMovements  StockMovement[]
  
  @@unique([clinicId, number])
  @@index([clinicId])
  @@index([clinicId, status])
}
```

---

## 5. Plano de Implementação por Fases

### ✅ Fase 1: Fundação (P0) - CONCLUÍDA

#### 1.1 Schema Changes
- [x] Adicionar campos dimensionais ao `Product` (saleType, boxCoverage, piecesPerBox, boxWeight, palletBoxes)
- [x] Adicionar campos `shade`/`caliber` ao `StockLot`
- [x] Criar model `Customer` (copiar estrutura de Patient)
- [x] Criar model `Architect`
- [x] Criar models `Quote`, `QuoteItem`
- [x] Criar models `Order`, `OrderItem`
- [x] Rodar migration: `npx prisma migrate dev --name add_sales_module`

#### 1.2 RBAC
- [x] Adicionar novas permissões em `permissions.ts`
- [x] Criar role SELLER no seed
- [x] Atualizar seed com novas permissões

#### 1.3 Limpeza do Frontend
- [x] Ocultar menu de Atendimentos
- [x] Ocultar menu de Agenda
- [x] Ocultar menu de Procedimentos

### ✅ Fase 2: Core de Vendas (P1) - CONCLUÍDA

#### 2.1 Backend Customers
- [x] Criar módulo `src/modules/customers/`
- [x] Controller, Service, DTOs
- [x] CRUD completo com soft delete

#### 2.2 Backend Architects
- [x] Criar módulo `src/modules/architects/`
- [x] CRUD básico

#### 2.3 Backend Quotes
- [x] Criar módulo `src/modules/quotes/`
- [x] Lógica de conversão m² → caixas
- [x] Geração de PDF (usando pdfkit existente) - `QuotePdfService`
- [x] Endpoints: create, update, send, approve, convert

#### 2.4 Backend Orders
- [x] Criar módulo `src/modules/orders/`
- [x] Conversão de Quote → Order
- [x] Baixa de estoque ao confirmar

#### 2.5 Frontend
- [x] Página de Clientes (CRUD) - `/dashboard/clientes`
- [x] Página de Arquitetos (CRUD) - `/dashboard/arquitetos`
- [x] Página de Orçamentos (lista, criar, editar) - `/dashboard/orcamentos`
- [x] Calculadora de m² → caixas no formulário
- [x] Página de Pedidos (lista, detalhes) - `/dashboard/pedidos`

### ✅ Fase 3: Estoque e Operação (P2) - CONCLUÍDA

- [x] Importação de produtos via CSV - `/dashboard/estoque/importar`
- [x] Importação de XML de NFe - `/dashboard/estoque/importar-nfe`
- [x] Alerta de lotes com tonalidade diferente na venda - `StockLotAlerts` component
- [x] Pedido de compra (básico) - `/dashboard/compras` + schema PurchaseOrder
- [x] Módulo de Entregas (Agendamento e Rastreamento) - `/dashboard/entregas`

### ✅ Fase 4: Financeiro e Relatórios (P3) - CONCLUÍDA

- [x] Integração com boletos (API Interna + Mock) - **Integração Real (Asaas) pendente**
- [x] Dashboard de vendas - `/dashboard/financeiro`
- [x] Relatório por vendedor - `/dashboard/financeiro/vendedores`
- [x] Relatório por arquiteto (comissões) - `/dashboard/financeiro/arquitetos`

---

## 6. Verificação

### Testes Automatizados
O projeto agora possui um script de verificação de fluxo E2E (End-to-End) em `scripts/test-live-flow.ts`.
Comando para rodar: `npx ts-node scripts/test-live-flow.ts`

### Testes Manuais (Fase 1)
1. **Schema**: `npx prisma migrate dev` deve rodar sem erros
2. **Seed**: `npm run seed` deve popular as novas permissões
3. **API**: Verificar endpoints via curl/Postman ou usando o script E2E.

### Testes Manuais (Fase 2)
1. Criar cliente PF e PJ via UI
2. Criar arquiteto via UI
3. Criar orçamento com produtos dimensionais
4. Verificar conversão m² → caixas
5. Gerar PDF do orçamento
6. Converter orçamento em pedido
7. Verificar baixa de estoque

---

## 7. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Renomear Patient quebra relatórios existentes | Alto | Manter Patient, criar Customer novo com migration de dados |
| Lógica de lotes complexa | Médio | Começar com warning, não bloqueio |
| Integração boletos | Baixo | Deixar para fase posterior |

---

## 8. Próximos Passos

1. ✅ Revisar este plano
2. ✅ Aprovar e iniciar Fase 1
3. ✅ Fase 1: Fundação - Concluída
4. ✅ Fase 2: Core de Vendas - Concluída
5. ✅ Fase 3: Estoque e Operação - Concluída
6. ✅ Fase 4: Financeiro e Relatórios - Concluída
7. ✅ **Concluído**: Geração de PDF de orçamentos
8. ✅ **Concluído**: Módulo de Entregas (Backend + Frontend)
9. ✅ **Concluído**: Módulo Financeiro (Boletos - Geração Interna)
