# QA — Achados a corrigir

> Teste manual E2E do fluxo comercial completo.
> Data: 2026-09-02. Ambiente: `docker compose` local (dev), loja seed "Mosaic Teste", usuário `admin@admin.com`.
> Status de cada item: `[ ]` aberto · `[x]` corrigido.
>
> - **Teste 1** (login → cadastros → orçamento → aprovação → conversão em pedido): B1-B2, A1-A4, L1-L7.
> - **Teste 2** (pagamento → pedido de compra → recebimento NF-e/entrada → alocação → entrega → conciliação financeira): B3, A5-A9, L8-L13.

---

## Blockers de ambiente (dev)

### [x] B1 — `docker compose up` sobe o backend quebrado · ✅ CORRIGIDO (Fase 1, verificado)
- **Sintoma:** backend não serve; `docker logs` mostra `Error: Cannot find module '/app/dist/main'`; login no front retorna 500.
- **Causa raiz:** o estágio `builder` do `Dockerfile` roda `npm run build`, que grava `tsconfig.tsbuildinfo` na imagem (`"incremental": true`). O comando de dev roda `nest start --watch`; o `nest-cli.json` tem `"deleteOutDir": true` — apaga `dist/` mas **não** o `tsconfig.tsbuildinfo`. O `tsc` incremental acha que já compilou tudo e **não emite** `dist/main.js`.
- **Correção:** `tsconfig.json` → `compilerOptions.tsBuildInfoFile: "./dist/tsconfig.tsbuildinfo"` — o cache passa a viver dentro de `dist/`, então o `deleteOutDir` do nest apaga junto e o `tsc` sempre emite. Removido o workaround `rm -f tsconfig.tsbuildinfo` do `docker-compose.yml`.
- **Produção não tocada:** `docker-compose.prod.yml` intacto. Build `--target runner` testado OK (`dist/main.js` gerado; bundle carrega até `DATABASE_URL required`, esperado). O `tsbuildinfo` em `dist/` é copiado mas nunca lido em runtime.
- **Verificado:** `docker compose down -v && up --build` do zero → backend sobe sem erro, `/health` 200, login no front `admin@admin.com`/`123456` → dashboard. `/app/tsconfig.tsbuildinfo` na raiz não existe mais.

### [x] B2 — Compose de dev nunca roda o seed · ✅ CORRIGIDO (Fase 1, verificado)
- **Sintoma:** em máquina limpa o banco fica sem usuários → login impossível.
- **Correção:** `npm run seed` no `command` de dev do `docker-compose.yml`. Seed é 100% idempotente (`upsert` + IDs determinísticos). `docker-compose.prod.yml` não tem seed e não foi tocado.
- **Verificado:** no `up` do zero o seed roda (118 permissões, 4 roles, loja "Mosaic Teste", `admin@admin.com`, 3 arquitetos/clientes/fornecedores demo).

---

## Bugs de aplicação

### [ ] A1 — Novo Fornecedor: lookup de CNPJ sobrescreve campos já digitados (Média/Alta)
- **Repro:** `/dashboard/fornecedores` → Novo Fornecedor → digitar Nome "QA Fornecedor Teste", Cidade "Campinas", UF "SP", Telefone "(19) 3000-2000" → digitar um CNPJ **válido** (`11.222.333/0001-81`) → Salvar.
- **Esperado:** os dados digitados são mantidos.
- **Obtido:** o lookup automático na Receita/BrasilAPI sobrescreveu Nome → "CAIXA ESCOLAR DA ESCOLA ESTADUAL DE ENSINO FUNDAMENTAL JOSEFINA JACQUES NORONHA", Cidade → "SAO SEBASTIAO DO CAI", UF → "RS", Telefone → "5136354333". Só `email` e `notes` (não retornados pelo lookup) sobreviveram.
- **Correção sugerida:** preencher via lookup apenas campos vazios; ou pedir confirmação antes de sobrescrever; ou disparar o lookup só no clique explícito em "Buscar CNPJ" (hoje dispara também no `onChange`/`onBlur` do campo).
- **Nota:** o mesmo padrão de "buscar por documento" existe no form de Cliente (botão "Buscar CEP") — verificar se tem o mesmo comportamento destrutivo.

### [ ] A2 — Menu do orçamento oferece "Aprovar" em status inválido (Média)
- **Repro:** abrir orçamento em **Rascunho** → menu "..." → "Aprovar Orçamento".
- **Obtido:** erro do backend *"Apenas orçamentos enviados podem ser aprovados"* (400). O backend barra corretamente — nenhuma transição inválida ocorre.
- **Correção sugerida:** esconder/desabilitar "Aprovar Orçamento" enquanto o status não for "Aguardando Aprovação". Idem revisar todas as ações do menu por estado (ex.: "Enviar ao Cliente" também só faz sentido em Rascunho).

### [x] A3 — Form manual de produto grava `saleType = UNIT` para produtos de m² (Média) · ✅ CORRIGIDO (Fase 2, verificado)
- **Correção:** form de produto (create/edit/avulso) agora tem `unit` e `saleType` em `<select>` (trava AREA p/ m²); backend `stock.service.normalizeUnitAndSaleType` deriva `saleType` (`M2`/`boxCoverage>0` → `AREA`) quando não vem no payload. Verificado: produto m² criado pela tela grava `saleType='AREA'`.
- **Repro:** `/dashboard/estoque/produtos` → Novo Produto → Unidade "m²", "m² por Caixa" = 1.44 → Criar. No banco: `Product.saleType = 'UNIT'`.
- **Esperado:** `saleType = 'AREA'` quando a unidade é m² / há `boxCoverage` (é o que o importador de planilha faz).
- **Impacto:** colunas do PDF de orçamento e da UI que dependem de `saleType` (ex.: `QuoteTemplate.showUnitArea`), relatórios.
- **Correção sugerida:** adicionar seletor de tipo de venda no form, ou derivar de `unit`/`boxCoverage` no submit (front ou `stock.service.createProduct`).

### [x] A4 — `unit` "m²" quebra a detecção de m² na emissão fiscal (Média, latente) · ✅ CORRIGIDO (Fase 2, verificado)
- **Correção:** backend normaliza `unit` (`'m²'`/`'Metro Quadrado'`/… → `'M2'`) em create e update; `fiscal.emitirNota` tolera `['M2','M²']`. Bônus: com `unit='M2'` correto, o orçamento passou a exibir **Preço/m²** (a lógica já existia, chaveada em `unit === 'M2'`, mas nunca disparava com `'m²'`).
- **Contexto:** `fiscal.service.emitirNota` decide a unidade/quantidade do item da NF-e com `item.product.unit?.toUpperCase() === 'M2'`.
- **Problema:** o form manual grava `unit` literal `"m²"`. `"m²".toUpperCase()` → `"M²"` ≠ `"M2"` → a checagem falha → a NF-e sairia com **quantidade em caixas** em vez de m², e `unidade` "UN"/"CX".
- O importador de planilha normaliza para `"M2"`; o form manual não.
- **Correção sugerida:** normalizar `unit` no cadastro (M2/UN/CX/ML/PC) — via enum/select no form ou saneamento no service. Alternativamente tornar a checagem no fiscal resiliente (`['M2','M²','M2 '].includes(...)`), mas normalizar na origem é melhor.
- **Ainda não exercitado ponta a ponta** — confirmar no teste do módulo fiscal.

---

## Cosméticos / baixa prioridade

### [ ] L1 — Máscaras não persistidas; listas exibem valor cru
- Cliente/Arquiteto criados pela tela salvam `document`/`phone` só com dígitos (`11144477735`); registros do seed têm máscara salva. As listas só formatam quando o valor já vem mascarado. Decidir: normalizar sempre para dígitos e formatar na exibição (recomendado), ou salvar mascarado.

### [ ] L2 — Modal "Novidades da Versão" mostra mensagem de commit crua
- Ex.: `quotes: melhorar UI do combobox de produto e robustez" -m "- Ampliado espaço do popover... f3b47ee`.
- O `scripts/sync-changelog.js` (frontend) não está limpando o corpo do commit / hash antes de exibir em `src/data/latest-release.json`.

### [ ] L3 — Ruído no AuditLog
- Linhas `CREATE Quote` duplicadas (uma com `message` vazio, outra descritiva) — provável dupla escrita (interceptor + `auditService.log` explícito).
- `VIEW` logado a cada abertura de página de detalhe ("Visualizou registro de Quote").

### [ ] L4 — Logging de debug ligado em runtime
- `main.ts` loga método/URL/origin/User-Agent de **toda** request.
- Há um `[Audit Debug]` que loga o **body inteiro** da request (incl. todos os itens do orçamento) no stdout.
- Remover/rebaixar para nível debug antes de produção.

### [ ] L5 — Artefato de ponto flutuante em `areaWithMargin`
- `OrderItem.areaWithMargin` gravado como `49.50000000000001` (20 m² @ 10%). `resultingArea` fica limpo (50.4). Cosmético; considerar arredondar a 4 casas ao persistir.

### [ ] L6 — Feedback de sucesso inconsistente
- Cliente/Arquiteto/Fornecedor/Produto mostram banner/toast verde. Criação de orçamento apenas redireciona sem confirmação visual.

### [x] L7 — Form de produto · ✅ CORRIGIDO (Fase 2, verificado)
- **Correção:** os dois forms de produto agora têm **dois campos de custo** — 'Custo por m²' ⇄ 'Custo da Caixa' — que se auto-preenchem via `boxCoverage`; `Product.costCents`/`priceCents` continuam sendo sempre o valor da caixa. Verificado nos dois sentidos de digitação.
- "Unidade" é texto livre (sujeito a typo) — ver A3/A4.
- O custo/preço **por m²** aparece na UI (helper "Custo da Cx", "Venda da Cx") mas só o valor **por caixa** é persistido em `Product.costCents`/`priceCents`. `costPerM2Cents` existe só no DTO de import, não no model — ok, mas documentar que `Product.costCents` é sempre "custo da caixa/unidade".

---

## Teste 2 — Blockers

### [x] B3 — Não é possível confirmar entrada de estoque gerada de um Pedido de Compra · ✅ CORRIGIDO (Fase 3, verificado)
- **Correção:** `createFromPurchaseOrder` grava `purchaseOrderId` + `purchaseOrderItemId` em cada item. Verificado: entrada gerada de PC confirma direto (API e UI), sem 'Item Avulso'.
- **Repro:** PC Confirmado → "Dar Entrada (Estoque)" → preencher NF → "Confirmar Entrada".
- **Obtido:** `POST /stock/entries/:id/confirm` → 400 `{ code: 'PO_DIVERGENCE', message: 'Divergência detectada entre o pedido de compra e a nota fiscal.' }`. E o **frontend não mostra o erro** — o botão "Confirmar Entrada" simplesmente não faz nada (falha silenciosa).
- **Causa raiz:** `createFromPurchaseOrder` (`stock-entry.service.ts` ~L400) cria os `StockEntryItem` **sem `purchaseOrderItemId`**, mas seta `entry.purchaseOrderId`. Em `confirmEntry` (~L546-570), como `poItemsMap.get(undefined)` não acha o item, cai no `else if (linkedPoItemIds.length > 0 || entry.purchaseOrderId)` e empurra `"Item Avulso: o produto X não faz parte do pedido de compra"` para **todos** os itens → dispara `PO_DIVERGENCE`.
- **Correção sugerida:** `createFromPurchaseOrder` deve gravar `purchaseOrderItemId` (e opcionalmente `purchaseOrderId`) em cada `StockEntryItem`. Também: o front deve exibir o payload de divergência (`divergences[]`) e oferecer o fluxo de `forceConfirm` + justificativa que o backend já suporta.
- **Workaround usado no teste:** `UPDATE "StockEntryItem" SET "purchaseOrderItemId" = <poi.id>` casando por `productId`.

---

## Teste 2 — Bugs de aplicação

### [x] A5 — Confirmar entrada corrompe `Product.costCents` (dupla conversão) — Alta / financeiro · ✅ CORRIGIDO (Fase 3, verificado)
- **Correção:** `createFromPurchaseOrder` grava `unitCost` **por m²** (custo da caixa ÷ boxCoverage) para produto de área, como o `confirmEntry` espera; e a checagem de divergência de preço compara **custo da caixa vs custo da caixa** (mesma fórmula do update). Verificado: após confirmar, `Product.costCents` = 7200/3456 (não infla); com divergência aprovada fica 7920 (= 79,20/cx), não 11404.
- **Repro:** entrada de estoque de produto m² (Porcelanato, `boxCoverage` 1.44, custo da caixa R$ 72,00) → Confirmar.
- **Obtido:** `Product.costCents` passa de `7200` para **`10368`** (= 72 × 1.44 × 100). Revestimento: `3456` → `3732` (= 34,56 × 1.08). O custo da caixa (que já é por caixa) é re-multiplicado por `boxCoverage` como se fosse por m².
- **Impacto:** `costCents` (10368) fica **maior que** `priceCents` (10080) → o produto passa a "vender no prejuízo" em qualquer relatório de margem / valorização de estoque. Distorce precificação futura (motor de markup usa `costCents`).
- **Relacionado a A3/A4:** a entrada assume custo por m² para produto m²; o PC passou custo por caixa. Alinhar a semântica de "custo unitário" na entrada.

### [x] A6 — Reservas não são baixadas (`CONSUMED`) na entrega — Alta / integridade de estoque · ✅ CORRIGIDO (Fase 3, verificado)
- **Correção:** `orders.updateStatus` marca as `StockReservation` do pedido como `CONSUMED` logo após o `confirmExit` na entrega. Verificado: reservas 32/19 → CONSUMED; lotes 3/2; disponível fica positivo.
- **Repro:** pedido com reservas ACTIVE → entregar → `StockExit` SALE confirmado, lotes zerados.
- **Obtido:** as `StockReservation` continuam **`ACTIVE`**. Lote = 0, mas reservado = 56 → disponível = `0 − 56 = −56`. `ReservationStatus.CONSUMED` existe no enum mas **nunca é setado** neste fluxo.
- **Impacto:** qualquer checagem de disponibilidade desses produtos fica negativa/corrompida; reservas "fantasma" acumulam.
- **Correção sugerida:** `stock-exit.service.confirmExit` (ou o passo de entrega) deve marcar as reservas vinculadas ao pedido como `CONSUMED` ao dar baixa.

### [ ] A7 — Sem lançamento de cobrança (CHARGE) para a venda — Alta / conciliação financeira
- **Repro:** pagar um pedido integralmente e entregar.
- **Obtido:** `finance.service.registerPayment` só **credita** a `PatientAccount` (`balanceCents += amount`) e cria `Transaction` tipo `PAYMENT`. Nunca é criado um `CHARGE` correspondente ao valor do pedido.
- **Resultado:** após pedido pago e entregue, o saldo da conta-corrente do cliente fica **+R$ 4.604,83** (crédito fantasma) em vez de R$ 0. Schema diz `balanceCents` `// Negativo = deve, Positivo = crédito`.
- **Riscos:** limite de crédito / extrato do cliente ficam errados; cancelamento/estorno não tem contra-partida para reverter.
- **Correção sugerida:** ao confirmar o pedido (ou na entrega), lançar `Transaction` `CHARGE` de `order.totalCents` na conta do cliente; o `PAYMENT` então zera o saldo.

### [x] A8 — `PurchaseOrderItem.quantityReceived` não é atualizado — Média / integridade · ✅ CORRIGIDO (Fase 3, verificado)
- **Correção:** com o vínculo do B3, o incremento de `quantityReceived` (que já existia) passa a rodar. Verificado: 35/21 e PC → RECEIVED.
- Após o PC virar `RECEIVED` e a entrada ser confirmada, `quantityReceived` continua `0` nos dois itens. Rastreio de recebimento parcial (`PARTIAL`) fica quebrado.

### [x] A9 — Erro de confirmação de entrada não é exibido — Média / UX · ✅ CORRIGIDO (Fase 3, verificado)
- **Correção:** porta o modal de divergência (que só existia em `/entradas/nova`) para `/entradas/[id]`: catch de `PO_DIVERGENCE`/`PRICE_DIVERGENCE`, lista de divergências, justificativa + supervisor, `forceConfirm`. Também corrigido o binding `onClick={handleConfirm}` → `onClick={() => handleConfirm()}` (passava o evento como forceConfirm). Verificado: modal aparece ('R$ 72,00 | R$ 79,20'), aprovar com justificativa confirma.
- O 400 de `PO_DIVERGENCE` (e provavelmente outros erros do confirm) não gera toast nem mensagem; o botão só "não responde". Ver B3.

---

## Teste 2 — Cosméticos / baixa prioridade

### [ ] L8 — Datas exibidas 1 dia antes (timezone) — recorrente
- Campos `<input type="date">` gravam UTC-meia-noite; a exibição formata em fuso local (BRT −03:00) → aparece 1 dia antes.
- Observado: PC "Previsão de Entrega" digitei 15/09 → lista e detalhe mostram **14/09**; NF "Data de Emissão" digitei 02/09 → cabeçalho da entrada mostra **01/09**. No banco a data está correta.
- Afeta: lista e detalhe de Pedido de Compra, cabeçalho da Entrada de Estoque, "Chegada Prevista" no rastreio do pedido.
- **Correção sugerida:** formatar datas "date-only" em UTC (ou gravar `YYYY-MM-DD` sem hora) na camada de exibição.

### [ ] L9 — Relatório de receita não identifica o cliente
- `GET /finance/reports/revenue` retorna `patientName: "Não identificado"` para pagamentos de pedido, mesmo com `Transaction.customerId` preenchido. O relatório resolve só a relação legada `patient`, não `customer`. Também há UTF-8 duplo-codificado no JSON ("Não").

### [ ] L10 — Badge "% Regra Global" enganoso nos arquitetos
- A lista de arquitetos mostra o badge "% Regra Global" para todos, mesmo quando **não existe** nenhuma `CommissionRule` na loja (seed não cria nenhuma). "Dados de Comissão" no pedido corretamente diz "Nenhuma regra aplicável".

### [ ] L11 — Form de PC: selecionar fornecedor cadastrado também preenche "Nome Avulso"
- Ao escolher um fornecedor no select, o campo de texto livre "Ou Nome Avulso" também é preenchido com o mesmo nome (FK + nome denormalizado ambos setados). Provavelmente inofensivo, mas confuso.

### [x] L12 — Tabela de itens da Entrada rotula caixas como "m²" · ✅ CORRIGIDO (Fase 2, verificado)
- **Correção:** tabela de itens da Entrada rotula qty de produto AREA como `cx` (não a unidade do produto). O m² real continua na 2ª linha.
- Na tela "Continuar Entrada", a coluna "Quantidade" mostra "35 m²" / "21 m²" quando são **caixas**; o m² real (50,40 / 22,68) aparece na 2ª linha. Rótulo errado.

### [ ] L13 — Pedido transita por `OrderStatus` deprecado
- O fluxo passa por `AGUARDANDO_MATERIAL`, marcado `// Deprecated` no schema. `stock-allocation.service` ainda atribui esse valor. Limpar o enum e a máquina de estados (ver A2).

---

## Conciliação financeira — veredito (Teste 2)

| Item | Valor | Confere? |
|---|---|---|
| Recebido do cliente (PIX 3.000 + Dinheiro 1.604,83) | R$ 4.604,83 | ✅ = total do pedido |
| `Transaction` PAYMENT na conta do cliente | R$ 4.604,83 | ✅ |
| `finance/reports/revenue` (soma por método) | R$ 4.604,83 | ✅ |
| Conta a pagar ao fornecedor (`Expense`) | R$ 3.245,76 | ✅ = total do Pedido de Compra |
| Custo real da mercadoria (35×72 + 21×34,56) | R$ 3.245,76 | ✅ |
| Lucro bruto real (4.604,83 − 3.245,76) | **R$ 1.359,07** | — |
| **Saldo da conta-corrente do cliente** | **+R$ 4.604,83** | ❌ deveria ser R$ 0 — falta CHARGE (A7) |
| **`Product.costCents` após a entrada** | R$ 103,68 / R$ 37,32 por caixa | ❌ inflado — deveria ser 72,00 / 34,56 (A5) |
| **Reservas do pedido após entrega** | 56 cx `ACTIVE` | ❌ deveriam estar `CONSUMED`; disponível = −56 (A6) |

**Conclusão:** o **caixa** (entrada vs saída de dinheiro) concilia perfeitamente. O que **não** bate: (1) conta-corrente do cliente com crédito fantasma; (2) custo do produto inflado após a entrada, distorcendo margem e valorização de estoque; (3) reservas não baixadas.

---

### [ ] L14 — `POST /purchase-orders` sem validação de DTO
- Enviar payload incompleto (sem `supplierName`, `totalCents` ou `item.totalCents`) → **500** (`PrismaClientValidationError`) em vez de 400 com mensagem clara. O service é passthrough puro pro Prisma, sem `class-validator`. Descoberto ao montar o cenário da Fase 3 via API (o form do frontend preenche tudo, então não aparece na UI).

## Observações a verificar (não confirmadas como bug)

### [ ] O1 — `finance/reports/inventory-valuation` retornou tudo zero
- No momento da checagem o estoque estava zerado (pós-entrega), então `totalItems: 0` / `totalCostCents: 0` **pode** estar correto. Não deu para validar com estoque em mãos (o B3 travou o meio do fluxo). Re-testar com lote positivo.

### [ ] O2 — Overlay de dev do Next acusou "1–2 Issues"
- O badge de erros do Next dev (canto inferior esquerdo) apareceu com "1 Issue" / "2 Issues" em algumas telas (login, orçamento, entrada). Não investiguei o conteúdo — podem ser warnings de hidratação/console. Abrir o overlay e checar.

### [ ] O3 — Painel lateral do Pedido não mostra a quebra de desconto/frete
- A lista de itens do drawer do pedido mostra só os 2 totais de item + "Total R$ 4.604,83"; a quebra (subtotal − desconto + frete) só aparece no "Resumo Financeiro" do orçamento. Pequeno ruído de UX — confirmar se é intencional.

---

## O que passou (referência — não regredir)

- Login, contexto multi-tenant (`X-Clinic-Id`), RBAC (loja "Mosaic Teste", todos os módulos).
- CRUD de Cliente, Arquiteto, Fornecedor, Produto.
- Motor de markup: hierarquia global (40%) e override por produto (60%) → preço de venda automático correto, por m² e por caixa.
- Cálculo dimensional do orçamento: `inputArea` → `+margem` → `ceil(area / boxCoverage)` → `resultingArea`, com breakdown da sobra (margem vs arredondamento) na UI.
  - Verificado: 45 m² @10% ÷ 1,44 = 35 cx = 50,40 m²; 20 m² @10% ÷ 1,08 = 21 cx = 22,68 m².
- Totais do orçamento: subtotal 4.689,30 − 5% global (234,47) + entrega 150,00 = **4.604,83** (exato).
- Máquina de estados do orçamento: Rascunho → Enviado → Aprovado → Convertido, com menu coerente por estado e `QuoteHistory` completo.
- Conversão orçamento → pedido: `Order #0001` com itens/quantidades/preços/total idênticos; orçamento → `CONVERTIDO`; FK `Order.quoteId` ligada; caminho de transferência de reservas executado.

### Teste 2 (pagamento → compra → recebimento → entrega)

- Pagamento com split (PIX R$ 3.000 + Dinheiro R$ 1.604,83) → 2 `Payment` APPROVED + 2 `Transaction` PAYMENT; soma = total do pedido.
- Ao pagar: auto-alocação disparada; sem estoque → `fulfillmentStatus = AWAITING_STOCK`; `Emitir NF-e` habilitado.
- Pedido de Compra vinculado ao pedido de venda: itens auto-importados do pedido (qtd em caixas, custo = custo da caixa do produto), subtotal correto.
- PC: Rascunho → Enviado → Confirmado → (Dar Entrada) → Recebido.
- Entrada de estoque a partir do PC: `StockLot` criado com qtd correta em caixas (35 / 21); `StockMovement` IN 35 / 21.
- Confirmação da entrada dispara `processStockArrival` → pedido de venda auto-alocado (`MATERIAL_RECEBIDO` / `IN_PICKING`), reservas criadas nos lotes (cross-dock funcionando).
- "Lançar Despesa" no PC → `Expense` R$ 3.245,76, PENDING, tipo SUPPLIER, com boleto.
- Pedido: Material Recebido → Pronto p/ Retirada → Entregue. Ao entregar: `StockExit` SALE auto-criado e confirmado; `StockMovement` OUT 35 / 21; lotes zerados.
- **Conciliação de caixa OK**: recebido do cliente R$ 4.604,83 = total do pedido; conta a pagar ao fornecedor R$ 3.245,76 = total do PC; `finance/reports/revenue` soma R$ 4.604,83 por método.
