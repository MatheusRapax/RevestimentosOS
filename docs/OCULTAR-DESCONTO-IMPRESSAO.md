# Ocultar Desconto na Impressão — toggle por item do orçamento

**Desde:** branch `feat/orcamento-ocultar-desconto-item`
**Onde:** `prisma/schema.prisma` (`QuoteItem.hideDiscount`), `src/modules/quotes/quotes.service.ts`
(`processQuoteItem`, `updateItem`, `duplicateQuote`), `src/modules/quotes/pdf/quote-pdf.service.ts`
(PDF via PDFKit), `clinicos-web/src/components/quotes/quote-template-viewer.tsx` (impressão via
navegador), telas `orcamentos/novo` e `orcamentos/[id]/editar`

---

## Resumo

Pedido do cliente: por item do orçamento, poder **esconder do cliente que existe desconto** naquele
produto — o PDF/impressão mostra o valor já com desconto como se fosse simplesmente o preço do
produto, sem "De: R$ X / Por: R$ Y" e sem a coluna de desconto.

**Regra inegociável:** isso é *só* uma máscara visual no documento entregue ao cliente. Em nenhum
momento o valor real (`unitPriceCents`, `discountCents`, `discountPercent`, `totalCents`) é alterado,
substituído ou deixa de ser gravado. Toda a contabilidade interna — relatórios financeiros, comissão,
margem, auditoria — continua enxergando o desconto real, sempre.

---

## Como funciona

- Novo campo `QuoteItem.hideDiscount` (`Boolean @default(false)`, migration puramente aditiva). Some
  do PDF/impressão o "De/Por" e a coluna de desconto **somente quando** `hideDiscount = true` **e**
  `discountCents > 0`; nesses casos, mostra `discountedPriceCents` (o preço já com desconto) no lugar
  do preço cheio, como se fosse o valor normal do produto.
- Sem afetar em nada `unitPriceCents`/`discountCents`/`discountPercent`/`totalCents` — o toggle entra
  só na hora de decidir o que *escrever* no PDF, nunca nos cálculos.
- **Padrão é `false`** (comportamento atual, mostra o desconto) — orçamentos existentes não mudam de
  aparência até alguém marcar o checkbox explicitamente.
- Disponível nas duas telas de edição de orçamento (`novo` e `[id]/editar`): o checkbox **"Ocultar
  desconto na impressão"** só aparece quando aquele item já tem desconto (`discountCents > 0`), com um
  preview do preço que vai aparecer no PDF e o aviso de que o valor real continua registrado
  normalmente.
- Na tela interna de detalhe do orçamento (`/dashboard/orcamentos/[id]`, não é impressão), o desconto
  real sempre aparece para quem trabalha no sistema — com um selo amarelo **"Oculto na impressão"** ao
  lado, avisando o vendedor que aquele desconto específico não vai aparecer pro cliente.

## Os dois lugares que renderizam o orçamento

Não existe um único ponto de renderização — o PDF baixável (`GET /quotes/:id/pdf`, gerado no backend
via PDFKit) e a impressão via navegador (`/dashboard/orcamentos/[id]/print`, que usa o componente
`QuoteTemplateViewer`, o mesmo dos templates de layout em Config. de Catálogo) duplicam essa lógica de
forma independente. Os dois foram alterados da mesma forma. "Independente se está usando um modelo/
template ou não" (como pedido) já é atendido naturalmente: `QuoteTemplate` só controla quais *colunas*
aparecem (`showQuantity`, `showUnitArea`, `showUnitPrice`) — o toggle de desconto é por item, embutido
nos dois pontos de renderização, e vale com qualquer template escolhido.

## O vazamento indireto pelo resumo do rodapé (e a correção)

O PDF tem uma linha de resumo, **"Desc. por item"**, que soma o desconto de todos os itens do
orçamento. Se essa soma continuasse contando o desconto de um item marcado como oculto, o total não
bateria com o que foi detalhado item a item — o cliente perceberia a diferença e o objetivo do recurso
seria furado.

**Decisão (confirmada com o usuário):** a linha de resumo soma **só** o desconto dos itens com
`hideDiscount = false`. Um item oculto não entra nem no detalhe da linha dele, nem na soma do rodapé —
consistência total no documento do cliente. Isso significa que o "Subtotal" (bruto, antes de
descontos) também precisou ser recalculado com a mesma regra: `subtotalCents + Σ(discountCents dos
itens NÃO ocultos)`, em vez de somar o desconto de todos os itens. Nos relatórios financeiros internos
e no banco de dados, o desconto de todos os itens (ocultos ou não) continua sendo contado normalmente,
sempre — essa exclusão existe *apenas* dentro da montagem do PDF/impressão.

---

## Bug pré-existente encontrado e corrigido de passagem

Durante o teste deste recurso, foi descoberto que **editar e salvar um orçamento zerava o desconto em
R$ de qualquer item que tivesse sido criado com desconto em % pela tela "Novo Orçamento"** — mesmo que
a edição não tivesse nada a ver com aquele item (ex.: só adicionar um item novo).

Causa raiz: `QuotesService.processQuoteItem()` calculava `discountCents` a partir do `discountPercent`
recebido, mas **nunca devolvia o `discountPercent` no objeto retornado** — então `create()` (usado por
"Novo Orçamento") gravava o item com `discountCents` certo mas `discountPercent` **sempre `null`** no
banco. Ao reabrir esse orçamento na tela de edição, o campo "Desconto (%)" carregava `null → 0`
silenciosamente. Se a pessoa salvasse qualquer coisa no orçamento depois disso (mesmo sem tocar
naquele item — a tela reenvia todos os itens a cada "Atualizar Orçamento"), o `0%` era enviado de
volta ao backend, que zerava de vez o desconto daquele item.

Corrigido adicionando `discountPercent` ao objeto que `processQuoteItem()` devolve, para que `create()`
e `addItem()` (que hoje gravam o item inteiro a partir desse retorno) persistam o percentual desde a
criação — igual o `duplicateQuote()` e o `updateItem()` já faziam. Sem essa correção, o próprio recurso
de ocultar desconto ficaria sobre uma base que apagava o desconto sozinha ao primeiro salvamento
seguinte — por isso foi tratado como parte deste trabalho, e não como um item separado.

---

## Testado

- Item com 10% de desconto (R$ 38,00 → R$ 34,20/caixa) e `hideDiscount = true`: PDF mostra só
  "R$ 34,20" na coluna de preço unitário, "-" na coluna de desconto, total da linha batendo com
  `totalCents` real. Confirmado via banco de dados que `discountCents`, `discountPercent` e
  `totalCents` continuam com os valores reais (nunca zerados, nunca reescritos).
- Orçamento misto: um item com desconto oculto (10%) e outro com desconto visível (20%, "De: R$ 38,00
  / Por: R$ 30,40", "-R$ 22,80 (20%)"). "Subtotal" do rodapé bate exatamente com a soma dos preços
  mostrados linha a linha (nenhum vazamento); "Desc. por item" mostra só os R$ 22,80 do item visível,
  sem nenhum resquício do desconto do item oculto; "TOTAL" bate com a soma real dos dois itens.
  Regenerado via `GET /quotes/:id/pdf` e lido diretamente do PDF gerado.
- Tela interna de detalhe do orçamento: desconto real sempre visível para o vendedor, com o selo
  "Oculto na impressão" ao lado do item marcado — nunca escondido de quem trabalha no sistema.
- Regressão do bug pré-existente: criado item com 10% de desconto, editado o orçamento adicionando um
  segundo item (sem tocar no primeiro) e salvo — desconto do primeiro item confirmado intacto no banco
  após a correção (antes da correção, ia a zero).
- Backend (`nest build`) e frontend (`next build`, 60 páginas) — build de produção limpo.

## UI: botão "Adicionar Item" reposicionado

Ajuste separado, pedido junto: o botão de adicionar item, antes fixo no topo do card (fora de vista
assim que a lista de itens cresce), foi trocado por uma área clicável maior com borda tracejada, sempre
logo abaixo do último item da lista — e também como estado vazio quando não há nenhum item ainda. Não
precisa mais rolar a tela inteira até o topo para adicionar mais um item no meio de um orçamento longo.
