# Plano de correção — achados do QA E2E

**Branch:** `fix/qa-e2e-ajustes` (a partir de `main` / v1.12.0)
**Base:** `docs/QA-E2E-FINDINGS.md`
**Regras respeitadas:** sem tocar em `docker-compose.prod.yml`, no pipeline de importação / `calcCostCents` / `ai-import` / PDF de orçamento, nem no modelo de custo por m². **Sem migração de schema** em nenhuma fase (deploy de produção sem risco de banco).

---

## Fase 1 — Validação de entrada (400 em vez de 500 / de "aceitou")

Baixo risco: são DTOs novos / constraints novas. O `ValidationPipe` global já existe; hoje vários controllers recebem `@Body() body: any` e por isso não validam nada.

| Achado | Mudança |
|--------|---------|
| F2 | `updateStatus` de pedido: validar `payments[]` **antes** da transação — `@IsEnum(PaymentMethod)`, `@IsInt() @IsPositive()`, `installments` opcional `@IsInt() @Min(1)`. E no `catch` do `updateStatus`, repassar `HttpException` como está (hoje tudo vira 500). |
| F8 | No mesmo ponto: `soma(payments)` tem de bater com `order.totalCents` (tolerância de alguns centavos) → senão `400`. Excedente explícito continua fora de escopo (não há conceito de adiantamento). |
| F4 | `CreateQuoteDto` e `CreateQuoteItemDto`: `@Max(100)` em `discountPercent` (global e item). |
| F5 | `CreateQuoteDto.items`: `@ArrayMinSize(1)`. |
| F7 | `CreateQuoteItemDto`: `@Max(100000)` em `inputArea`, `@Max(100000)` em `quantityBoxes` (limites de sanidade; evita overflow de Int). |
| F6 | `quotes.service.create`: `findUnique` do cliente (no tenant) antes de criar → `NotFoundException('Cliente não encontrado')` em vez de deixar vazar a violação de FK. |
| F-RMA-4 | `CreateOccurrenceItemDto.quantity`: `@IsInt() @Min(1)`. |
| F-COMM-5 | `CommissionTierDto.commissionRate`: `@Max(100)`. `CreateCommissionRuleDto.tiers`: quando informado, `@ArrayMinSize(1)`. |
| F-FIN-2 | Novo `CreateExpenseDto` (`@IsNotEmpty` description, `@IsInt() @IsPositive()` amountCents, `@IsDateString` dueDate, `@IsEnum(ExpenseType)` type, opcionais `barCode`/`recipientName`/`purchaseOrderId` string) e trocar `@Body() body: any` no `ExpensesController.create`. |
| F-FIN-3 | Novo `CreateServiceInvoiceDto` (valor obrigatório positivo, prestador, número, datas `@IsDateString`) no `finance.controller` `createServiceInvoice`. |
| F-FIN-4 | Novo `GenerateInvoiceDto` (`@IsUUID` orderId, `@IsDateString` dueDate) e `UpdateInvoiceStatusDto` (`@IsIn(['PAID','CANCELLED'])`). Em `generateInvoice`: bloquear 2º boleto **PENDING** para o mesmo pedido e bloquear boleto para pedido `PAGO`/`CANCELADO` (400). |

## Fase 2 — Máquinas de estado e integridade (pedido / ocorrência)

Risco médio: mexe em lógica de transição. Nenhuma migração; só guardas.

| Achado | Mudança |
|--------|---------|
| F3 | Tabela de transições válidas por `OrderStatus` no `orders.service.updateStatus` — bloquear pulos (ex.: `CRIADO`→`ENTREGUE`) e retrocessos não previstos. `CANCELADO` continua acessível dos estados atuais. Entrega exige pedido `PAGO` (ou o estado logístico equivalente já existente). |
| F1 (parcial) | Com F2+F8 os caminhos de crash que deixavam pagamento/cobrança órfãos deixam de existir (validação antes da transação). O refactor profundo — passar o `tx` para dentro do `FinanceService` (hoje `chargeOrder`/`registerPayment` usam `this.prisma` e não fazem rollback junto) — fica registrado como follow-up, fora desta branch por ser invasivo. Vou **limpar os registros órfãos** do pedido #1 no ambiente de teste. |
| F-RMA-3 | Guarda de transição em `occurrences.service.updateStatus` (RASCUNHO→REPORTADO→AGUARDANDO_FORNECEDOR→{RESOLVIDO\|REEMBOLSADO}; CANCELADO a partir de qualquer não-final). |
| F-RMA-1 | Cancelar ocorrência que já passou por `REPORTADO` → lançar movimento de estoque compensatório (devolve o que foi baixado) + registrar no histórico. Dentro de uma transação. |
| F-RMA-2 | Entrar em `REEMBOLSADO` → criar `Transaction` de estorno na conta-corrente do cliente (quando houver `customerId`), dentro de transação e idempotente (não duplica se repetir). |

## Fase 3 — Comissões (somente endpoints de leitura; sem write, sem migração)

Risco médio (os números nas telas vão mudar — é o objetivo). Nenhuma alteração de escrita.

| Achado | Mudança |
|--------|---------|
| F-COMM-1 | `getSellersPerformance`: além dos `User` com papel `SELLER`, incluir qualquer `User` que seja `sellerId` de pedido/orçamento no período. |
| F-COMM-2 | `getSellersPerformance`: substituir o `receita * 0.03` fixo pelo cálculo com `CommissionRule`/`CommissionTier` (reaproveitar a lógica de `calculateOrderCommissions`). Fallback: se não há regra, 0 (e sinalizar "sem regra"). |
| F-COMM-3 | `getArchitectsPerformance`: implementar o cálculo com tiers (a regra global de arquiteto já funciona no endpoint por pedido). |
| F-COMM-4 | `getArchitectsPerformance`: atribuir a venda por `order.quote.architectId` (fallback `customer.architectId`), alinhando com `GET /orders/:id/commissions`. Feito via `include` da relação — **sem** adicionar `Order.architectId` (evita migração). |

## Fase 4 — Financeiro

| Achado | Mudança |
|--------|---------|
| F-FIN-6 | Novo `GET /finance/customers/:customerId/account` — espelha `getPatientAccount` resolvendo `Customer`. `getOrCreateAccount` já suporta `customerId`. Aditivo. |
| F-FIN-1 | `getDashboardStats`: "Faturamento" passa a ser **pagamentos recebidos no período** (igual ao `reports/revenue`); adicionar campo separado `billedCents` ("pedidos faturados") para quem quiser o outro número. Widget `today-revenue`: filtrar pelo **dia** e usar pagamentos. ⚠️ o número de "Faturamento" na tela vai diminuir — é esperado e correto. |
| F-FIN-5 | `expenses.service.markAsPaid`: se já `PAID`, retornar sem reescrever `paidAt`. |
| F-FIN-7 | **Fora desta branch.** Custo por lote / média ponderada mexe no modelo de custo (área sensível de produção). Decidir separadamente. Opção mínima possível no futuro: não sobrescrever `Product.costCents` no `forceConfirm`. |

## Fase 5 — Visual (frontend)

Risco baixo; sem mudança de lógica.

| Achado | Mudança |
|--------|---------|
| V1 | Envolver a `<table>` das telas de lista dos fluxos (`pedidos`, `estoque/ocorrencias`, `financeiro/contas-a-pagar`, `financeiro/notas-servico`, `financeiro/vendedores`, `financeiro/arquitetos`) num `div.overflow-x-auto` com `min-w` na tabela e `whitespace-nowrap` nos cabeçalhos → colunas deixam de ser cortadas/inacessíveis no mobile. **Redesenho completo para cards em todas as ~22 tabelas do sistema = esforço à parte**, não entra aqui. |
| V2 | Empty state nas telas "Desempenho por Vendedor" e "Comissões de Arquitetos" (mensagem + call-to-action em vez do dashboard todo zerado). |
| V3 | Fade/scroll-hint nas linhas de chips de filtro que transbordam no mobile (se barato; senão fica de fora). |
| V4 | Verificar persistência do modal "Novidades da Versão" (localStorage por versão). Corrigir só se estiver reaparecendo a cada carga. |

---

## Testes (após implementar)

1. **Reconstruir e rodar as 7 rotinas de QA** (`_qa_*.py`) numa clínica recém-semeada:
   - happy paths (venda ponta a ponta, NF divergente, RMA DEFEITO/ENTREGA, comissão por pedido) **têm de continuar passando idênticos**;
   - testes de quebra: cada `500`/"aceitou" vira `400`/`404` com mensagem;
   - novas asserções por correção (transições bloqueadas, estoque devolvido no cancelamento, estorno criado, relatórios de comissão com valor ≠ 0/≠ mock, conta-corrente de cliente legível).
2. **Click-through no frontend real** (desktop + viewport 375px) dos 5 fluxos: orçamento→pedido→pagamento→entrega; criar despesa; nota de serviço; RMA; boleto. Confirma que os payloads reais do app continuam passando na validação nova (risco principal de regressão).
3. **Builds:**
   - `docker compose exec -T backend npx tsc -p tsconfig.build.json --noEmit`
   - `docker compose exec -T frontend npx tsc --noEmit` **e** `docker compose exec -T frontend npm run build` (o `next build` faz type-check estrito que o `next dev` não faz).
4. **Segurança de produção:**
   - `git diff --stat main` só toca `src/**` e `clinicos-web/src/**` (+ `docs/`);
   - `docker-compose.prod.yml` e o `Dockerfile` de produção intocados;
   - sem migração Prisma nova (`prisma migrate status` limpo);
   - pipeline de importação / `calcCostCents` / `ai-import` / PDF de orçamento não aparecem no diff.
5. Relatório final com o resultado de cada item + `git diff --stat`, e **aguardo sua decisão de merge** (sem versionar/merge sem seu OK).

---

## Preciso da sua decisão em 2 pontos

1. **F-FIN-1** — concorda que "Faturamento" no dashboard financeiro passe a mostrar **dinheiro recebido** (vai ficar menor que hoje, mas bate com o relatório de receita), com um campo à parte para "pedidos faturados"? Ou prefere manter como está e só corrigir o widget "hoje"?
2. **F-FIN-7** (revalorização de estoque no `forceConfirm` de NF) e o **refactor profundo de atomicidade do F1** — confirmo que ficam **fora** desta branch para tratarmos separado?

Itens sem controvérsia (Fases 1, 2 exceto F1-profundo, 3, 4 exceto F-FIN-7, 5) sigo assim que você aprovar.
