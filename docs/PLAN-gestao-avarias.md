# PLAN-gestao-avarias

## 🧠 Objective
Criar um módulo completo de Ocorrências (RMA) para gerenciar avarias, defeitos e problemas logísticos de forma estruturada, mantendo o controle contábil/físico do estoque sem perder rastreabilidade e métricas de desempenho.

## 👥 Agent Assignments
- **Orchestrator:** Coordenar o fluxo e transições de estado.
- **Backend Specialist:** Implementar Prisma Schema, Service, Controller e DTOs para Ocorrências. Lidar com baixas de estoque causadas pelas ocorrências.
- **Frontend Specialist:** Criar telas (Listagem Kanban/Table, Form de Criação e Timeline de Detalhes).
- **Database Designer:** Planejar tabelas e enumerações de status.

---

## 🏗️ Architecture & Database Changes (Phase 1)
Como existem módulos dependentes (Estoque, Pedidos), precisamos integrar as Ocorrências neles. Tocar as tabelas atuais minimamente.

**Novos Models no `schema.prisma`:**

1. **Enum `OccurrenceType`**
   - `RECEBIMENTO` (Avaria na chegada do fornecedor)
   - `ENTREGA` (Quebrou durante Rota para o Cliente)
   - `DEFEITO` (Defeito de Fabricação relatado pelo cliente pós-entrega)

2. **Enum `OccurrenceStatus`**
   - `RASCUNHO` (Apenas relatado, não afetou estoque)
   - `REPORTADO` (Estoque baixado como perda temporária, aguardando ação)
   - `AGUARDANDO_FORNECEDOR` (Aguardando reposição ou crédito)
   - `RESOLVIDO` (Recebido reposição física ou reposição enviada ao cliente)
   - `REEMBOLSADO` (Crédito financeiro recebido)
   - `CANCELADO`

3. **Enum `StockMovementType` (Alteração)**
   - Adicionar o tipo `AVARIA` (Para diferenciar de saídas de venda `SAIDA`).

4. **Model `Occurrence`**
   - `id`, `clinicId`, `number` (Ex: RMA-0012)
   - `type` (OccurrenceType)
   - `status` (OccurrenceStatus)
   - `supplierId` (Opcional - Se for defeito/recebimento)
   - `customerId` (Opcional - Se for entrega)
   - `orderId` (Opcional - Link com a Venda)
   - `stockEntryId` (Opcional - Link com a Nota de Entrada)
   - `notes` (String)
   - `createdAt`, `updatedAt`
   - Relacionamentos: `supplier`, `customer`, `order`, `stockEntry`, `items`.

5. **Model `OccurrenceItem`**
   - `id`, `occurrenceId`
   - `productId`, `lotId` (Opcional)
   - `quantity` (Int)
   - `reason` (Ex: "Caixa molhada", "Cerâmica trincada no meio")
   - Relacionamentos: `product`, `lot`.

---

## 📋 Task Breakdown & Implementation Steps

### Phase 1: Database & Core Backend
- [ ] Atualizar `schema.prisma` com os novos modelos e enums de RMA.
- [ ] Rodar `npx prisma migrate dev` e gerar o Prisma Client.
- [ ] Criar o módulo Backend `occurrences` (Service, Controller, Module).
- [ ] Criar DTOs: `CreateOccurrenceDto`, `UpdateOccurrenceStatusDto`.

### Phase 2: Stock Integration
- [ ] Integrar `OccurrencesService` com o `StockService` (ou injetar `PrismaService` para transações atômicas).
- [ ] Implementar regra: Quando status muda para `REPORTADO`, criar `StockMovement` do tipo `AVARIA` e deduzir as quantidades do `StockLot`.
- [ ] Implementar regra: Quando status muda para `RESOLVIDO` (recebimento do fornecedor), criar `StockMovement` do tipo `ENTRADA` (com flag oculta isReposition) no lote.

### Phase 3: Frontend - UI Development
- [ ] Criar página `/dashboard/estoque/ocorrencias`.
- [ ] Implementar listagem (Tabela) com filtros por `Status`, `Tipo`, e `Fornecedor/Cliente`.
- [ ] Implementar página de Criação Modal (`Nova Ocorrência`):
      - Seleção de Tipo (Recebimento, Entrega, Defeito).
      - Busca inteligente (Ex: Se escolher "Recebimento", forçar selecionar um `Fornecedor`).
      - Adição dinâmica de `OccurrenceItems` (Produtos, Qtd, Motivo).
- [ ] Implementar página/modal de Detalhes da Ocorrência.
      - Timeline de status.
      - Botões de Ação: "Mudar para Aguardando Fornecedor", "Finalizar como Reembolsado", "Finalizar como Resolvido".

### Phase 4: Integration Points 
- [ ] Na tela de "Entrada de Estoque" (`/dashboard/estoque/entradas`), adicionar botão "Relatar Avaria nesta Nota", abrindo o modal de Ocorrência pré-preenchido.
- [ ] Na tela de "Pedidos" (`/dashboard/pedidos`), adicionar botão "Relatar Avaria/Defeito" no pedido Finalizado/Entregue.

---

## ✅ Verification Checklist
- [ ] Criar uma ocorrência de Recebimento deduz o estoque corretamente usando `MovementType.AVARIA`.
- [ ] Relatórios de estoque conseguem distinguir perdas de avarias versus saídas de venda.
- [ ] Ocorrências são listadas e podem ser navegadas por diferentes status.
- [ ] Nenhuma quebra nas transações contábeis/financeiras do estoque original.
