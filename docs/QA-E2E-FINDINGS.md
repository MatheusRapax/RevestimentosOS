# QA E2E — Venda ponta a ponta, Quebra, NF divergente, RMA, Financeiro, Comissões

**Data:** 2026-09-05
**Escopo:** teste black-box (sem alteração de código) do fluxo comercial completo, testes de quebra com valores inválidos, entrada de NF com valores divergentes do pedido de compra, fluxo de RMA/avaria, módulo financeiro em profundidade e comissões de vendedores e arquitetos. Inclui um smoke-check visual das telas envolvidas nesses fluxos.
**Ambiente:** stack local Docker (`revestimentos-backend` :3000 / `revestimentos-frontend` :3001), clínica de seed `f11eff62-86ec-43b4-9ee9-25b86d4391b3`, `admin@admin.com`.

> **Status (2026-09-05):** todos os achados foram corrigidos e verificados — ver `docs/QA-E2E-FIX-PLAN.md` (seção RESULTADO) e os commits `fix(qa): …`. Merge de v1.13.0 já em `main`. O F-FIN-7 (custo médio de estoque) virou feature documentada em `docs/CUSTO-MEDIO-ESTOQUE.md`.
>
> As correções da rodada anterior (`docs/QA-FINDINGS.md`) e da auditoria de UI (`docs/QA-UX-FINDINGS.md`, v1.12.0) continuam válidas — este documento é complementar.

---

## Resumo por severidade

Todos os itens abaixo estão **✅ corrigidos** (v1.13.0 + branch `fix/nf-custo-valoracao` para o F-FIN-7). Repro/causa/correção de cada um no detalhamento e em `docs/QA-E2E-FIX-PLAN.md`.

| ID | Severidade | Área | Resumo |
|----|-----------|------|--------|
| F1 | 🔴 Crítico | Venda / Pagamento | `PATCH /orders/:id/status` com `payments[]` não é atômico — falha parcial deixa pagamento e cobrança fantasma, pedido travado em CRIADO |
| F3 | 🔴 Alto | Venda / Pedido | Sem máquina de estados — CRIADO→ENTREGUE direto é aceito (entrega sem pagar, baixa estoque, sem receita); transições para trás aceitas |
| F6 | 🟠 Médio | Orçamento | `customerId` inexistente → 500 (violação de FK vaza; deveria ser 404) |
| F7 | 🟠 Médio | Orçamento | `inputArea` gigante (999999) → 500 (overflow de Int em `totalCents`) |
| F4 | 🟠 Médio | Orçamento | Sem `@Max(100)` em `discountPercent` (global e item) — 150%/200% aceitos → total 0 |
| F2 | 🟠 Médio | Pagamento | Sem validação de DTO em `payments[]` — método inválido → 500 cru; valor negativo → 500 |
| F5 | 🟡 Baixo | Orçamento | Sem `@ArrayMinSize(1)` em `items` — orçamento vazio aceito |
| F8 | 🟡 Baixo | Pagamento | Pagamento acima do total aceito silenciosamente (sem validação valor ≈ total) |
| F-RMA-1 | 🔴 Alto | RMA | CANCELADO depois de REPORTADO **não devolve o estoque baixado** — perda fantasma permanente |
| F-RMA-2 | 🟠 Médio | RMA | Status REEMBOLSADO não tem efeito financeiro nenhum — não gera estorno, crédito em conta-corrente nem nota de crédito |
| F-RMA-3 | 🟡 Baixo | RMA | Sem máquina de estados em `PATCH /occurrences/:id/status` — qualquer status → qualquer status (só valida enum) |
| F-RMA-4 | 🟡 Baixo | RMA | `OccurrenceItem.quantity` sem `@Min(1)` — quantidade negativa/zero aceita |
| F-COMM-1 | 🔴 Alto | Comissão | Tela "Desempenho por Vendedor" fica zerada — filtra `User` só por papel `SELLER`; instalação padrão (só ADMIN) → nenhum vendedor aparece apesar de pedidos reais |
| F-COMM-2 | 🔴 Alto | Comissão | Comissão do vendedor no relatório financeiro é `receita * 0,03` fixo — ignora `CommissionRule`/tiers configuradas |
| F-COMM-3 | 🔴 Alto | Comissão | `GET /dashboard/finance/architects` retorna `commissionTotal: 0` fixo (TODO) — arquiteto nunca tem valor a pagar mesmo com regra ativa |
| F-COMM-4 | 🟠 Médio | Comissão | Atribuição de venda ao arquiteto é inconsistente: endpoint por pedido usa `quote.architectId`, relatório financeiro usa `customer.architectId` |
| F-COMM-5 | 🟡 Baixo | Comissão | Sem `@Max` em `commissionRate` (9999% aceito); regra sem tiers → 201; tier mais baixo funciona como piso mesmo sem bater a meta |
| F-FIN-6 | 🔴 Alto | Financeiro | Não existe API para ler a conta-corrente de um **Cliente** — `chargeOrder` grava por `customerId`, mas a única rota de leitura busca só `Patient` → 404 para cliente de venda |
| F-FIN-1 | 🟠 Médio | Financeiro | Duas definições de "faturamento": dashboard = soma de `order.totalCents` (inclui não pago); relatório de receita = soma de pagamentos reais. Diferem por um pedido não pago |
| F-FIN-2 | 🟠 Médio | Financeiro | `POST /expenses` (Contas a Pagar) sem validação — valor negativo → 201; campos faltando / data / tipo inválidos → 500 cru |
| F-FIN-3 | 🟠 Médio | Financeiro | `POST /finance/service-invoices` (Notas de Serviço) sem validação — `amountCents` faltando → 500 |
| F-FIN-4 | 🟠 Médio | Financeiro | `POST /finance/invoices` gera **boleto duplicado** para o mesmo pedido sem trava; gera boleto para pedido já pago; `dueDate` lixo → 500; status inválido no PATCH → 500 |
| F-FIN-5 | 🟡 Baixo | Financeiro | `PATCH /expenses/:id/pay` em despesa já paga → 200, reescreve `paidAt` (sem idempotência) |
| F-FIN-7 | 🟡 Baixo | Financeiro | `forceConfirm` de NF divergente sobrescreve `Product.costCents` → revaloriza retroativamente **todo** o estoque em mãos daquele SKU na valoração de inventário |
| V1 | 🟠 Médio | Visual | Telas de lista usam `<table>` de colunas fixas que **não** vira card no mobile — a 375px a tabela tem ~924px, colunas além da 2ª ficam inacessíveis, texto truncado |
| V2 | 🟡 Baixo | Visual | "Desempenho por Vendedor" mostra dashboard todo zerado (empty state não tratado) — parece quebrado |
| V3 | 🟡 Baixo | Visual | Linhas de chips de filtro de status transbordam na horizontal no mobile (rolável, mas sem indicação) |
| V4 | 🟡 Baixo | Visual | Modal "Novidades da Versão 1.12.0" — confirmar que a dispensa persiste e não reaparece a cada carga |

---

## O que funciona (happy path confirmado)

**Venda ponta a ponta**
- Cálculo do orçamento com produto por m² (valor da caixa ÷ `boxCoverage`, margem, arredondamento para cima em nº de caixas), desconto global **e** por item, e taxa de entrega — reconciliou com exatidão (subtotal, descontos, frete, total).
- Ciclo do orçamento: `enviar` → `aprovar` → `converter` em pedido.
- Pagamento dividido (PIX + CASH) na conversão para PAGO.
- Alocação automática de estoque ao entrar em PAGO (reservas ACTIVE, FIFO por lote).
- `PRONTO_PARA_ENTREGA` → `ENTREGUE`: baixa o estoque uma única vez, consome as reservas, grava `deliveredAt`.
- Conta-corrente do pedido #2: `CHARGE` (`order.totalCents`) + `PAYMENT`s → saldo líquido 0 (verificado via banco).
- Relatório de receita resolve o nome do cliente (correção L9 mantida).

**NF-e com valores divergentes do pedido de compra**
- Confirmar entrada **sem** divergência: OK.
- Confirmar **com** divergência de preço → `400` com `code: PO_DIVERGENCE` e o detalhamento ("Pedido: R$72,00 | NF: R$90,00").
- `forceConfirm` sem `justification` → `400`; com justificativa → confirma e registra.
- Confirmar entrada já confirmada → `400` "Entrada não está em rascunho".
- Preenchimento obrigatório do cabeçalho da NF (número, série, natureza, emissão) antes de confirmar.

**RMA / Avaria**
- DEFEITO (pós-entrega): `RASCUNHO`→`REPORTADO` baixa o estoque como perda + cria `StockMovement` tipo `AVARIA` (+ pedido vinculado vai a `AGUARDANDO_REPOSICAO`); `AGUARDANDO_FORNECEDOR`→`RESOLVIDO` devolve o estoque.
- ENTREGA (quebrou no transporte): `RASCUNHO`→`REPORTADO` baixa o estoque (correto — a mercadoria saiu); `RESOLVIDO` **não** repõe (correto — só RECEBIMENTO/DEFEITO repõem).
- `create` ignora `status` vindo no DTO (sempre nasce `RASCUNHO`) — correto.
- Status fora do enum no PATCH → `400` com a lista de valores válidos.

**Comissões**
- `GET /orders/:id/commissions` aplica corretamente `CommissionRule` + `CommissionTier` com agregação do mês corrente: no pedido #2 (total R$ 2.893,98) → vendedor 2% = R$ 57,88, arquiteto 1% = R$ 28,94.
- Criação de regra valida: `commissionRate` negativo → `400`; `targetType` fora de `SELLER`/`ARCHITECT` → `400`.

**Contas a Pagar**
- Dashboard de despesas agrega corretamente pendente / vencido / pago no mês.
- Vencimento é calculado dinamicamente (PENDING com `dueDate` passada aparece como OVERDUE na listagem).

---

## Detalhamento dos bugs

### Venda / Pedido / Pagamento

#### F1 — 🔴 `PATCH /orders/:id/status` com `payments[]` não é atômico
**Repro:** converter orçamento em pedido; `PATCH /orders/:id/status` com `status: PAGO` e um `payments[]` cujo primeiro item é válido e o segundo inválido (ex.: método fora do enum).
**Obtido:** o primeiro pagamento e a `Transaction` de `CHARGE` já foram gravados quando o segundo estoura. Resposta 500, mas o pedido fica em `CRIADO` com um `Payment` PIX fantasma e uma cobrança sem contrapartida. O saldo do cliente fica negativo.
**Evidência viva:** o pedido #1 do ambiente carrega até hoje um PIX de 144699 + `CHARGE` de 289398 órfãos — aparecem no `GET /finance/reports/revenue` inflando o total (R$ 4.916,97 com 4 transações, sendo 3 de 144699 para o mesmo cliente).
**Causa provável:** o laço que cria os pagamentos e a cobrança não está dentro de uma `prisma.$transaction`, e não há rollback do que já foi persistido.
**Sugestão:** envolver criação de pagamentos + `chargeOrder` + mudança de status numa única transação; validar todo o array **antes** de gravar qualquer coisa.

#### F2 — 🟠 Sem validação de DTO em `payments[]`
**Repro:** `PATCH /orders/:id/status` `{status: PAGO, payments: [{method: "MOEDA_PODRE", amountCents: X}]}`; e outro com `amountCents: -1000`.
**Obtido:** método inválido → `500 Internal server error` (crash do Prisma em `finance.service.ts:737`, `method: method as any`). Valor negativo → `500` (a `BadRequestException` lançada em `registerPayment` é re-embrulhada como 500 pelo `try/catch` do `updateStatus`).
**Esperado:** `400` com mensagem clara.
**Sugestão:** DTO com `@IsEnum(PaymentMethod)` e `@IsInt() @IsPositive()` em cada item; não engolir `BadRequestException` no `catch` do `updateStatus`.

#### F3 — 🟠→🔴 Pedido não tem máquina de estados
**Repro:** logo após converter (status `CRIADO`), `PATCH /orders/:id/status {status: "ENTREGUE"}`.
**Obtido:** `200`, pedido vai direto para `ENTREGUE`, o estoque é baixado, nenhum pagamento é exigido e nenhuma receita é registrada. Também aceita transição para trás (`ENTREGUE`→`MATERIAL_RECEBIDO`).
**Esperado:** só permitir transições adjacentes válidas; bloquear entrega de pedido não pago.
**Sugestão:** tabela de transições permitidas por `OrderStatus` (e `FulfillmentStatus`), validada no `updateStatus`.

#### F4 — 🟠 `discountPercent` sem teto
**Repro:** `POST /quotes` com `discountPercent: 150` (global) e outro com `discountPercent: 200` num item.
**Obtido:** `201`; total resultante 0 (e a matemática do item pode ir a negativo).
**Sugestão:** `@Min(0) @Max(100)` no DTO de orçamento (global e item).

#### F5 — 🟡 Orçamento sem itens é aceito
**Repro:** `POST /quotes {customerId, items: []}` → `201`.
**Sugestão:** `@ArrayMinSize(1)` em `items`.

#### F6 — 🟠 `customerId` inexistente → 500
**Repro:** `POST /quotes` com `customerId` que não existe.
**Obtido:** `500` (violação de FK do Postgres vaza na resposta).
**Esperado:** `404 "Cliente não encontrado"`.
**Sugestão:** validar existência do cliente (e do tenant) antes de criar.

#### F7 — 🟠 `inputArea` gigante → 500
**Repro:** `POST /quotes` com item `inputArea: 999999`.
**Obtido:** `500` (overflow ao calcular `totalCents` como Int de 32 bits).
**Sugestão:** limite de sanidade em `inputArea`/`quantityBoxes`; capturar overflow e retornar `400`.

#### F8 — 🟡 Pagamento acima do total aceito em silêncio
**Repro:** `PATCH /orders/:id/status {status: PAGO, payments: [{method: PIX, amountCents: total + 50000}]}`.
**Obtido:** `200`, pedido `PAGO`, conta-corrente do cliente fica positiva (crédito) sem nenhum aviso.
**Sugestão:** validar `soma(payments) ≈ order.totalCents` (com tolerância), ou tratar excedente explicitamente como adiantamento/crédito.

### NF-e / Entrada de estoque

#### F-FIN-7 — 🟡 `forceConfirm` revaloriza todo o estoque do SKU  ✅ RESOLVIDO (feature)
**Contexto:** ao forçar a confirmação de uma entrada com preço divergente (NF R$90/cx vs pedido R$72/cx), o `Product.costCents` mestre é sobrescrito para o valor da NF (9000).
**Efeito colateral:** `GET /finance/reports/inventory-valuation` usa o `costCents` **atual** × quantidade em mãos, então uma única NF mais cara revaloriza retroativamente todo o estoque pré-existente daquele produto, não só o lote novo.
**Correção:** `confirmEntry` passou a usar **custo médio ponderado móvel** em vez de "último custo" — é o método fiscal padrão para ERP de material de construção. Sem migração; não toca importação / `calcCostCents` / modelo m². Documentação completa e exemplos: **`docs/CUSTO-MEDIO-ESTOQUE.md`**. Teste `qa_custo_medio.py` 6/6 PASS.

### RMA / Ocorrências

#### F-RMA-1 — 🔴 CANCELADO não devolve o estoque baixado
**Repro:** criar ocorrência DEFEITO com 2 itens; `RASCUNHO`→`REPORTADO` (estoque cai); depois `→ CANCELADO`.
**Obtido:** o status muda, mas o estoque **não** volta. O `StockMovement` de `AVARIA` continua. Perda fantasma permanente.
**Causa:** `updateStatus` (`occurrences.service.ts:142`) só tem efeito colateral para `RASCUNHO→REPORTADO` e `AGUARDANDO_FORNECEDOR→RESOLVIDO`; qualquer outra transição é um `prisma.update` de status puro.
**Sugestão:** ao cancelar uma ocorrência que já passou por `REPORTADO`, reverter os lançamentos de estoque (movimento de entrada compensatório).

#### F-RMA-2 — 🟠 REEMBOLSADO não move dinheiro
**Repro:** ocorrência ENTREGA → `REPORTADO` → `REEMBOLSADO`.
**Obtido:** só muda o status. Não cria `Transaction` de estorno, não credita a conta-corrente do cliente, não gera nota de crédito. Do ponto de vista financeiro, "reembolsado" é só um rótulo.
**Sugestão:** ao entrar em `REEMBOLSADO`, lançar o estorno na conta-corrente do cliente (ou registrar a despesa/nota de crédito correspondente) dentro de uma transação.

#### F-RMA-3 — 🟡 Sem máquina de estados na ocorrência
**Repro:** `PATCH /occurrences/:id/status {status: "REEMBOLSADO"}` a partir de `RASCUNHO`.
**Obtido:** `200` — pula `REPORTADO` e toda a validação/baixa de estoque.
**Sugestão:** tabela de transições válidas por `OccurrenceStatus`.

#### F-RMA-4 — 🟡 `OccurrenceItem.quantity` sem mínimo
**Repro:** `POST /occurrences` com item `quantity: -5`.
**Obtido:** `201` (registro lixo; `REPORTADO` depois é no-op no estoque, mas a ocorrência fica gravada com quantidade negativa).
**Sugestão:** `@IsInt() @Min(1)` no item.

### Comissões

#### F-COMM-1 — 🔴 Tela "Desempenho por Vendedor" fica zerada
**Repro:** abrir `/dashboard/financeiro/vendedores` (ou `GET /dashboard/finance/sellers`) numa instalação de seed.
**Obtido:** `{"sellers": [], "totals": {tudo zero}}` — a tela mostra "Total Faturado R$ 0,00 / Pedidos 0 / Vendedores 0" mesmo havendo 3 pedidos reais (R$ 5.863,96 no dashboard financeiro).
**Causa:** `getSellersPerformance` (`dashboard.service.ts:373`) busca `User` com `clinicUsers.some.role.key === 'SELLER'`. O seed só tem o usuário ADMIN, então nenhum vendedor entra no relatório — e pedidos vendidos por quem não tem exatamente o papel `SELLER` ficam invisíveis.
**Sugestão:** incluir no relatório qualquer `User` que seja `sellerId` de algum pedido/orçamento no período, além dos que têm o papel; ou tratar o papel de forma mais ampla.

#### F-COMM-2 — 🔴 Comissão do vendedor é 3% fixo no relatório
**Local:** `dashboard.service.ts:417-419` — `// Commission logic (mock logic: 3% flat)` → `const commission = Math.round(totalRevenue * 0.03)`.
**Obtido:** ignora completamente `CommissionRule`/`CommissionTier`. O endpoint por pedido (`GET /orders/:id/commissions`) usa as regras corretamente — os dois caminhos discordam.
**Sugestão:** reaproveitar `calculateOrderCommissions`/a lógica de tiers no relatório de desempenho.

#### F-COMM-3 — 🔴 Comissão de arquiteto é 0 fixo
**Local:** `dashboard.service.ts:506` — `const commissionTotal = 0; // TODO: Implement tiered commission logic`.
**Obtido:** `/dashboard/finance/architects` retorna vendas corretas (Ana Lúcia: R$ 76,00) mas `commissionTotal: 0`. A tela "Comissões de Arquitetos" mostra "Comissões Pagas R$ 0,00 / Pendente Pagamento R$ 0,00" mesmo com uma regra global de 1% ativa. Arquiteto nunca tem valor a pagar.
**Sugestão:** implementar o cálculo com tiers (a regra e os tiers já existem no schema e funcionam no endpoint por pedido).

#### F-COMM-4 — 🟠 Atribuição de venda ao arquiteto inconsistente
**Obtido:** `GET /orders/:id/commissions` atribui pela `quote.architectId` do orçamento de origem; `GET /dashboard/finance/architects` atribui por `customer.architectId` (arquiteto padrão do cliente). Um mesmo pedido pode contar para arquitetos diferentes (ou para nenhum) dependendo da tela.
**Sugestão:** definir uma única fonte de verdade (provavelmente `order.architectId`, gravado na conversão) e usar em todos os relatórios.

#### F-COMM-5 — 🟡 Regras de comissão com validação frouxa
- `commissionRate: 9999` → `201` (sem `@Max`).
- Regra sem nenhum tier → `201` (quebra/zera no cálculo depois).
- Fallback de tier: `tiers.find(t => totalSales >= t.minGoalAmount) || tiers[último]` — o tier mais baixo acaba servindo de piso mesmo quando a meta dele não foi batida.
**Sugestão:** `@Max(100)` em `commissionRate`; exigir ≥1 tier; decidir explicitamente o comportamento abaixo da menor meta (0% vs. menor tier).

### Financeiro (aprofundado)

#### F-FIN-1 — 🟠 Duas definições de "faturamento"
**Obtido:**
- `GET /finance/dashboard` → `currentMonth.revenue = 586396` (R$ 5.863,96) = `SUM(order.totalCents)` de pedidos não cancelados/rascunho **criados** no mês → conta pedido **não pago** como receita.
- `GET /finance/reports/revenue` → `totalCents = 491697` (R$ 4.916,97) = `SUM` das `Transaction` do tipo `PAYMENT` → dinheiro que realmente entrou.
- `GET /dashboard/widgets/today-revenue` → `586396` também, e retorna o acumulado do mês apesar do rótulo "hoje".
**Sugestão:** uma definição única ("faturamento" = pagamentos recebidos, ou = pedidos faturados) usada em todas as telas; corrigir o widget "hoje" para o dia.

#### F-FIN-2 — 🟠 `POST /expenses` sem validação
**Repro / obtido:**
- `amountCents: -1000` → `201` (entra em Contas a Pagar e polui "Total Vencido/Pendente").
- sem `amountCents` → `500`; sem `description` → `500`; `dueDate: "nao-e-data"` → `500`; `type: "XPTO"` → `500`.
**Causa:** `ExpensesController` recebe `@Body() body: any`, sem DTO/`ValidationPipe` efetivo.
**Sugestão:** `CreateExpenseDto` com `@IsInt() @IsPositive()`, `@IsNotEmpty()`, `@IsDateString()`, `@IsEnum(ExpenseType)`.

#### F-FIN-3 — 🟠 `POST /finance/service-invoices` sem validação
**Repro:** `POST /finance/service-invoices {invoiceNumber: "X"}` (sem `amountCents`) → `500`.
**Causa:** `createServiceInvoice(clinicId, data: any)`.
**Sugestão:** DTO próprio com campos obrigatórios (valor, prestador, número, emissão).

#### F-FIN-4 — 🟠 Boletos: duplicado, sem checagem de status, sem validação de data
**Repro / obtido (pedido #2, já PAGO/ENTREGUE):**
- `POST /finance/invoices` → `201` gera o boleto.
- 2ª chamada idêntica → `201` gera **outro** boleto para o mesmo pedido (sem trava de duplicidade).
- Não verifica se o pedido já está pago.
- `dueDate: "data-lixo"` → `500`.
- `PATCH /finance/invoices/:id/status {status: "BANANA"}` → `500` (sem `@IsEnum`).
**Sugestão:** impedir 2º boleto PENDING para o mesmo pedido; bloquear boleto para pedido pago/cancelado; `@IsDateString` no `dueDate`; `@IsIn(['PAID','CANCELLED'])` no PATCH.

#### F-FIN-5 — 🟡 `PATCH /expenses/:id/pay` não é idempotente
**Repro:** pagar uma despesa duas vezes.
**Obtido:** 2ª chamada → `200`, reescreve `paidAt` para agora. Se as chamadas cruzarem a virada do mês, a despesa migra de bucket em "Pago (este mês)".
**Sugestão:** se já `PAID`, retornar sem alterar (ou `409`).

#### F-FIN-6 — 🔴 Conta-corrente do Cliente é inacessível pela API
**Repro:** `GET /finance/patients/{order.customerId}/account` para o cliente do pedido #2.
**Obtido:** `404 "Paciente não encontrado"`.
**Causa:** `getPatientAccount` (`finance.service.ts:65`) só faz `prisma.patient.findFirst` e lança 404; nunca consulta `Customer`. Mas `chargeOrder` cria `PatientAccount`/`Transaction` com `customerId`. Não há rota `GET /finance/customers/:id/account`.
**Efeito:** o extrato / saldo devedor do cliente B2B (que é o caso de uso do sistema) não tem como ser exibido; a conta-corrente é "somente escrita" para o módulo de vendas.
**Sugestão:** endpoint `GET /finance/customers/:customerId/account` (ou fazer o existente resolver `Patient` **ou** `Customer`).

---

## Visual / responsividade (smoke-check das telas do fluxo)

Rodada rápida a 375px nas telas envolvidas (Financeiro, Vendedores, Arquitetos, Contas a Pagar, Pedidos, Ocorrências). A auditoria v1.12.0 arrumou cabeçalhos de página, containers e navegação — estes pontos são das **tabelas de dados**, que não foram tocadas.

#### V1 — 🟠 Tabelas de lista não viram card no mobile
**Obtido:** Pedidos, Ocorrências e Contas a Pagar renderizam um `<table>` de colunas fixas. A 375px o `<table class="w-full">` de Contas a Pagar mede **924px de largura** (~2,5× a viewport); o `document` não rola na horizontal, então as colunas a partir da 2ª/3ª ficam **cortadas e inacessíveis** e o texto das células é truncado ("João Pedr…"). A lista de Ocorrências mostra uma barra de rolagem horizontal presa dentro do card.
**Provável alcance:** todas as telas de lista em tabela (clientes, fornecedores, compras, movimentações de estoque).
**Sugestão:** abaixo de `md`, renderizar cada linha como card (padrão já usado em outras telas do sistema) ou, no mínimo, envolver a tabela em `overflow-x-auto` com afordância de rolagem.

#### V2 — 🟡 "Desempenho por Vendedor" parece quebrado
**Obtido:** por causa de F-COMM-1, a tela mostra um dashboard inteiro zerado (R$ 0,00 / 0 / 0%) sem empty state.
**Sugestão:** empty state explícito ("Nenhum vendedor com papel cadastrado" + link para papéis) enquanto F-COMM-1 não for resolvido.

#### V3 — 🟡 Chips de filtro de status transbordam no mobile
**Obtido:** a linha "Todos os Status / A Vencer / Vencidas / …" passa da viewport (429px em 279px). Tem `overflow-x-auto`, então rola, mas sem nenhuma indicação visual.
**Sugestão:** gradiente/fade na borda ou quebrar em `flex-wrap`.

#### V4 — 🟡 Modal de changelog
**Obtido:** o modal "Novidades da Versão 1.12.0" apareceu no login. Confirmar que a dispensa é persistida (localStorage por versão) e não reaparece a cada carregamento.

---

## Observações que **não** são bug (verificadas)

- "Jo�o Pedro Silva", "R$�6.255,00" no output dos scripts: artefato de exibição do terminal do Windows (cp1252) sobre UTF-8 — os bytes no banco/response estão corretos (`U+00E3`, `U+00A0`).
- `inventory-valuation` retornou 128 itens / R$ 6.255,00 num teste e 124 itens / R$ 6.155,00 logo depois: diferença exata das 4 unidades de argamassa baixadas pelo teste de RMA ENTREGA no intervalo. Consistente.
- `create` de ocorrência com `status` no corpo: corretamente ignorado (nasce `RASCUNHO`).
