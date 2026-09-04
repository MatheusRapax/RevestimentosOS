# QA — Plano de correção (por fases)

> Correções dos achados de [`QA-FINDINGS.md`](./QA-FINDINGS.md).
> **Regra de ouro:** cada correção é seguida **imediatamente** de teste — re-executar a fatia do fluxo E2E afetada, conferir o estado no banco e checar a lista "O que passou" para garantir que nada regrediu.
> Marcar `[x]` no `QA-FINDINGS.md` ao concluir + validar cada item.

---

## Modelo de custo/preço confirmado (decisão do cliente, 2026-09-02)

- Produtos **AREA (m²)**: `Product.costCents` e `Product.priceCents` guardam **sempre o valor da CAIXA**.
- **Não** existe (e **não deve passar a existir**) campo de valor por m² no `Product` — mudar isso agora é arriscado demais.
- **Verificado:** `Product` só tem `costCents`/`priceCents` (por caixa). `costPerM2Cents` existe apenas como campo **transitório de DTO** (`import-products.dto.ts`, `ImportProductResult`) para exibir na **prévia da importação** — nunca é persistido.
- `QuoteItem.unitPriceCents` hoje guarda o **valor da caixa**. Decisão: **orçamento/pedido devem exibir sempre R$/m²** (dividindo pelo `boxCoverage`) — o PDF (`quote-pdf.service.ts` L384) **já faz isso corretamente**; falta só padronizar a tela.

### ✅ Verificado nas planilhas reais (2026-09-02)

- **É produto de m²** = tem `unit = M2` **OU** tem `m²/caixa` (`boxCoverage > 0`).
- Nesse caso, o valor na planilha vem **por m²** (Glam e Pierini têm coluna rotulada literalmente `R$/m²`; ex. Glam: `R$/m² 76,20` + `m² por caixa 2,07`).
- O sistema faz `valor_caixa = valor_m² × m²/caixa` e **guarda o valor da caixa** em `Product.costCents`/`priceCents`.
- Na exibição, divide de volta: `valor_m² = valor_caixa ÷ m²/caixa`.
- Exceção: planilhas tipo **Strufaldi** (têm `Unidade` explícita + várias colunas de preço) → a IA levanta `MULTIPLE_PRICES` e um humano escolhe a coluna; depois aplica a mesma regra.
- **Round-trip está correto e em produção. NÃO mexer em:** importação de planilha, `calcCostCents`, `ai-import`, PDF do orçamento.

### Confirmado no código — cadastro de produto

- **Backend** (`stock.service.createProduct` + `create-product.dto.ts`): passthrough burro. Persiste `costCents`/`priceCents`/`saleType`/`unit`/`boxCoverage` **exatamente como recebe**. `unit` é `@IsString` livre (não é enum); `saleType` é enum mas opcional (default `UNIT` no schema). Toda a lógica de conversão vive no **frontend**.
- **Modal de produto avulso** (`ad-hoc-product-modal.tsx`) — **já faz certo**: `unit` em select; `saleType` em select **travado em `AREA`** quando `unit = m2`; quando AREA, abre bloco com **`m²/caixa` obrigatório** + `peças/caixa`; campo de custo é **"Custo da Caixa"** (usuário digita valor da caixa) e mostra `= R$ x/m²` derivado; envia `costCents` = custo da caixa, `priceCents` = preço/m² × `boxCoverage` (= valor da caixa). **Só salva valor da caixa.**
- **Form normal** (`/dashboard/estoque/produtos` → "Novo Produto") — **inconsistente**: `unit` é texto livre (permite `'m²'` que quebra o fiscal — A4); **não tem select de `saleType`** (fica `UNIT` — A3); campo de custo é rotulado **"Custo (R$/m²)"** (convenção **oposta** à do avulso — usuário digita m², sistema deriva caixa). Valores de caixa gravados estão certos; o que está errado é `saleType` e `unit`.

---

## Fase 0 — Rede de segurança (antes de tocar em qualquer coisa)

- [ ] Snapshot do estado atual do banco de teste (`pg_dump` ou anotar os valores-chave).
- [ ] Congelar os **valores esperados de regressão** do E2E (já registrados em `QA-FINDINGS.md` → "O que passou"):
  - Orçamento: 45m² @10% ÷1,44 = 35cx = 50,40m²; 20m² @10% ÷1,08 = 21cx = 22,68m²; total R$ 4.604,83.
  - Pagamento split PIX 3.000 + Dinheiro 1.604,83; `revenue` soma R$ 4.604,83.
  - Entrada: lote 35/21 cx; movimentos IN/OUT 35/21; lotes zerados após entrega.
- [ ] Roteiro E2E reproduzível (este documento + `QA-FINDINGS.md` servem de script manual).

---

## Fase 1 — Ambiente de dev (B1, B2) · risco baixo · desbloqueia tudo

- [ ] **B1** — resolver de forma permanente o `Cannot find module '/app/dist/main'`:
  - opção A: `tsconfig.json` → `compilerOptions.tsBuildInfoFile: "./dist/tsconfig.tsbuildinfo"` (o `deleteOutDir` do nest passa a limpar junto);
  - opção B: `compilerOptions.incremental: false`.
  - Manter o `rm -f tsconfig.tsbuildinfo` do `docker-compose.yml` como cinto-e-suspensório ou remover depois de confirmar.
- [ ] **B2** — decidir se `npm run seed` fica no `command` do dev (idempotente) ou vira passo manual documentado no README.
- **Teste:** `docker compose down -v && docker compose up` do zero → backend sobe → `admin@admin.com` / `123456` loga → dashboard carrega.
- **Não regrediu:** `docker-compose.prod.yml` **não é tocado** (usa estágio `runner`, `node dist/main`).

---

## Fase 2 — Padronizar o cadastro de produto (A3, A4, L7, L12) · risco médio · muito cuidado

> **Reescopada.** Não é mais "mexer no modelo de importação" (esse está certo e em produção).
> É deixar o **form normal de produto** com o mesmo comportamento do **modal de avulso** (que já está correto), e resolver os desalinhamentos do cadastro manual. **A5 saiu daqui** → vai para a Fase 3 (anda junto do B3).
> Regra de ouro: **`Product.costCents` / `priceCents` sempre guardam o valor da CAIXA.** Nada muda no banco/schema de storage.

### 2a — Backend (defensivo, opcional mas recomendado)
- [ ] `create-product.dto.ts` / `update-product.dto.ts`: `unit` vira enum canônico `M2 | UN | CX | ML | PC | KG` **ou** o service sanea (`'m²' → 'M2'`, trim, upper).
- [ ] `stock.service.createProduct` / `updateProduct`: se `saleType` não vier, derivar → `unit === 'M2' || boxCoverage > 0` ⇒ `AREA`, senão `UNIT`.
- [ ] `fiscal.service.emitirNota`: tornar a checagem de m² tolerante (`['M2','M²'].includes(unit?.toUpperCase())`) — cinto-e-suspensório, mesmo com a normalização acima.
- Continua persistindo `costCents`/`priceCents` como recebidos.

### 2b — Frontend: unificar os dois forms (modal de avulso + "Novo Produto" normal)
- [ ] **Unidade de Medida** = `select` em ambos: `un / m² / cx / ml / pç / kg`. Enviar canônico maiúsculo (`UN/M2/CX/ML/PC/KG`).
- [ ] **Tipo de Venda** = `select`: `Por Unidade/Caixa` (UNIT) · `Por m²` (AREA) · `Ambos` (BOTH). **Trava em AREA** quando unidade = m² (igual ao avulso hoje).
- [ ] Quando `AREA`/`BOTH`: bloco com **`m² por caixa` (obrigatório)** + **`peças por caixa` (obrigatório)**.
- [ ] **Dois campos de custo** que se auto-preenchem via `boxCoverage`:
  - `Custo da Caixa (R$)` ⇄ `Custo por m² (R$)` — editar um recalcula o outro.
  - Mesmo padrão para o **preço** (ou manter "Preço Final" com toggle m²/caixa, desde que o enviado seja o da caixa).
  - **Sempre enviar** `costCents = custo_da_caixa × 100` e `priceCents = preço_da_caixa × 100`.
- [ ] `UNIT` (un/cx/pç): só um campo de custo (unidade/caixa), sem bloco de m².
- [ ] Aplicar também ao **form de edição** de produto e revisar `promote-adhoc-dialog.tsx` (mesma lógica de conversão).
- [ ] **L12:** tabela de itens da Entrada de Estoque — rotular quantidade de produto AREA como `cx`, não `m²` (o m² real fica na 2ª linha).

### 2c — Testes (rodar cada um logo após a mudança)
1. Form normal, produto m², preencher **Custo da Caixa** → "Custo por m²" auto-preenche certo → salvar → banco: `costCents` = caixa, `saleType='AREA'`, `unit='M2'`, `boxCoverage`+`piecesPerBox` gravados.
2. Form normal, produto m², preencher **Custo por m²** → "Custo da Caixa" auto-preenche → salva o **mesmo** valor de caixa do teste 1.
3. Form normal, produto `un`/`cx` → sem bloco de m², `saleType='UNIT'`, `unit='UN'`/`'CX'`.
4. **Regressão avulso:** criar produto avulso num orçamento → PDF continua mostrando **R$/m²** (não regredir o commit `f017c59`); valores da caixa gravados iguais aos de antes.
5. Emitir NF-e de um produto m² criado pelo form normal → `unit` casa com a checagem `=== 'M2'` (A4 resolvido).
6. Motor de markup: `preço = custo × (1 + markup/100)` continua certo (global 40% / override 60%).
7. **Regressão importação:** importar 1 planilha real (Glam/Pierini) → produtos gravados **idênticos** ao comportamento atual (nada dessa fase toca a importação).
8. Orçamento existente / produto já cadastrado → abrir, editar, salvar → nada muda de valor.

---

## Fase 3 — Estoque, reservas e recebimento (B3, A5, A6, A8, A9) · risco médio

- [ ] **B3** — `createFromPurchaseOrder` (`stock-entry.service.ts` ~L400) deve gravar `purchaseOrderItemId` (e `purchaseOrderId`) em cada `StockEntryItem`. Sem isso a divergência trata todo item como "avulso" e trava o `confirm`.
- [ ] **A5** — `confirmEntry` (L766-772) faz `finalCostCents = unitCost × boxCoverage × 100`, ou seja **espera `unitCost` por m²**. Mas `createFromPurchaseOrder` (L442) preenche `unitCost = PurchaseOrderItem.unitPriceCents / 100`, e esse `unitPriceCents` veio de `Product.costCents` (= **valor da caixa**) via o auto-PC do pedido. Resultado: valor da caixa × `boxCoverage` de novo → custo inflado (R$ 72 → R$ 103,68). **Opções de correção** (escolher uma):
  - (a) em `createFromPurchaseOrder`, para produto AREA, gravar `unitCost = unitPriceCents / 100 / boxCoverage` (deixa por m², como o `confirmEntry` espera); **ou**
  - (b) padronizar `StockEntryItem.unitCost` como "valor da caixa" e o `confirmEntry` **não** multiplicar (mas aí revisar a entrada manual, cujo campo hoje espera custo por m² em produto AREA); **ou**
  - (c) entrada de estoque de PC de produto **já catalogado** não reescrever `Product.costCents` (a "Last Cost Strategy" faz sentido para NF-e de fornecedor, não para cross-dock do próprio catálogo).
  - Recomendo **(a)** — menor mudança, mantém a convenção "unitCost por m² em produto AREA" já usada na entrada manual e na importação.
- [ ] **A9 / B3-front** — a tela "Continuar Entrada" deve exibir o payload de erro do `confirm` (`divergences[]`, `code: PO_DIVERGENCE`) e oferecer o fluxo `forceConfirm` + justificativa que o backend **já suporta**.
- [ ] **A6** — `confirmExit` (ou o passo de entrega em `orders.updateStatus`) marca as `StockReservation` do pedido como `CONSUMED` ao dar baixa. Verificar cálculo de disponível = `lote − reservas ACTIVE` não fica negativo.
- [ ] **A8** — `confirmEntry` incrementa `PurchaseOrderItem.quantityReceived` (+ status `PARTIAL`/`RECEIVED` conforme o total).
- **Testes:** PO → "Dar Entrada" → preencher NF → **Confirmar direto pela UI** (sem workaround). Conferir: `Product.costCents` **não infla** (A5); reservas `CONSUMED` após entrega; `quantityReceived` = pedido; disponível ≥ 0; lote zerado; `StockMovement` IN/OUT batendo. Regressão: entrada manual (sem PC) via NF-e continua gravando custo certo.

---

## Fase 4 — Financeiro / conta-corrente (A7) · risco médio

- [ ] **A7** — lançar `Transaction` tipo `CHARGE` de `order.totalCents` na conta do cliente ao confirmar/pagar o pedido, de modo que o `PAYMENT` zere o saldo. Definir o gatilho (confirmação do pedido? entrega?) e a idempotência (não duplicar em re-tentativa).
- [ ] Revisar cancelamento/estorno: hoje `orders.updateStatus` p/ `CANCELADO` cancela reservas mas **não** estorna pagamento/transação.
- **Testes:** pagar pedido → `PatientAccount.balanceCents` do cliente = **0** (não +460483). `finance/reports/revenue` continua R$ 4.604,83. Conferir extrato do cliente (CHARGE − PAYMENT = 0).

---

## Fase 5 — Máquina de estados orçamento/pedido (A2, L13) · risco baixo · ✅ CONCLUÍDA

- [x] **A2** — `orcamentos/[id]/page.tsx`: "Aprovar Orçamento" só em `AGUARDANDO_APROVACAO`; "Reservar Estoque" também gated por `EM_ORCAMENTO`/`AGUARDANDO_APROVACAO`. Demais ações já corretas por estado.
- [x] **L13** — `stock-allocation.service` grava `AGUARDANDO_COMPRA` no cenário "precisa comprar" (não mais `AGUARDANDO_MATERIAL`). Filtros de leitura em `orders.getStats`, `dashboard.getPendingOrders/getPendingDeliveries` e `pedidos/page.tsx` incluem `AGUARDANDO_COMPRA`, mantendo `AGUARDANDO_MATERIAL` como legado tolerante (pedidos antigos em produção). Enum não removido do schema de propósito — migração destrutiva em prod.
- **Teste:** ✅ Rascunho→Enviado→Aprovado→Convertido no browser: menu só oferece ações válidas, Aprovar funciona sem 400. Pedido Criado→Pago → auto-alocação sem estoque/PO → `status = AGUARDANDO_COMPRA` (UI + banco). Conta-corrente pós-pagamento = 0 (A7 sem regressão).

---

## Fase 6 — Cadastros e máscaras (A1, L1) · risco baixo · ✅ CONCLUÍDA

- [x] **A1** — helper `keep`/`keepField` nos lookups de `fornecedores/page.tsx` e `clientes/page.tsx` (CNPJ do Fornecedor, CNPJ e CEP do Cliente): só preenche campo vazio, nunca sobrescreve o digitado. Lookup continua no `onBlur` + botão, mas agora não-destrutivo.
- [x] **L1** — convenção: gravar dígitos, formatar na exibição. `formatDocument`/`formatPhone` (idempotentes) em `lib/masks.ts`, aplicados nas listas + diálogos de edição de Cliente e Arquiteto, lista + drawer de Pedidos, detalhe do Orçamento, recibo e romaneio.
- **Teste:** ✅ Fornecedor com Nome/Telefone/Cidade digitados + Endereço vazio + CNPJ real → Endereço preencheu, resto intacto. Cliente com Endereço digitado + Cidade vazia + CEP real → Cidade preencheu, Endereço intacto (confirmado no banco). "QA Cliente L1" criado pela tela grava dígitos crus e a lista exibe formatado igual ao seed.

---

## Fase 7 — Datas, relatórios e cosméticos (L8, L9, L10, L11, L2, L3, L4, L5, L6, L14) · ✅ CONCLUÍDA

- [x] **L8** — helper `formatDateOnly` (UTC) só nos campos date-only (previsão do PC lista+detalhe, chegada/emissão da Entrada, entrega/vencimento/chegada prevista no drawer de Pedidos). Timestamps reais intactos. Verificado: PC previsão 15/09 → mostra 15/09.
- [x] **L9** — `getRevenueReport` inclui `customer` e usa `customer?.name ?? patient?.name`. Verificado: pagamento do Pedido #1 → "Construtora Horizonte".
- [x] **L10** — badge "Regra Global" só com `architectRules.length > 0`; senão "Sem comissão". Verificado com seed.
- [x] **L11** — fornecedor cadastrado trava o "Nome Avulso" (disabled + ajuda) e o select ganhou "— Limpar seleção —". `supplierName` segue no payload.
- [x] **L2** — `sync-changelog.js` limpa hash/artefato de shell/link de compare; `latest-release.json` e `CHANGELOG.md` limpos. Verificado no modal.
- [x] **L3** (parcial) — interceptor não audita mais `VIEW` (era 1 write por abertura de detalhe). "Dupla linha CREATE Quote" não reproduzida em código — mantida em observação.
- [x] **L4** — log de request só fora de produção e enxuto; `[Audit Debug]` → `logger.debug` sem body.
- [x] **L5** — `areaWithMargin` arredondado a 4 casas no cálculo.
- [x] **L6** — `toast.success` na criação de orçamento. Verificado.
- [x] **L14** — `CreatePurchaseOrderDto` + item DTO com `class-validator`. Verificado: payload ruim → 400 com mensagens; válido → 201.

---

## Fase 8 — Observações a investigar (O1, O2, O3)

- [ ] **O1** — re-testar `inventory-valuation` com lote positivo em estoque.
- [ ] **O2** — abrir o overlay de erros do Next dev e catalogar os "issues" (hidratação/console).
- [ ] **O3** — confirmar se a ausência da quebra desconto/frete no drawer do pedido é intencional.

---

## Ordem sugerida de execução

`Fase 1` → `Fase 2` (padronizar cadastro; testar cada passo) → `Fase 3` → `Fase 4` → `Fase 5` → `Fase 6` → `Fase 7` → `Fase 8`.

Se preferir valor rápido primeiro: `Fase 1` → `Fase 5` → `Fase 6` → `Fase 7 (L8)` e deixar 2/3/4 num bloco dedicado.

> **Nota de escopo:** a importação de planilha, o `calcCostCents`, o `ai-import` e o PDF do orçamento **não são tocados** em nenhuma fase — o round-trip de preço (planilha R$/m² → guarda caixa → exibe R$/m²) já está correto e em produção.
