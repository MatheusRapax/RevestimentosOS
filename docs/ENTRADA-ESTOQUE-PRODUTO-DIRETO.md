# Entrada de estoque — busca por SKU, cadastro de produto na nota e lote obrigatório

**Onde:** `clinicos-web/src/app/dashboard/estoque/entradas/nova/components/items-grid.tsx`,
`clinicos-web/src/components/products/ad-hoc-product-modal.tsx` (prop `forceCatalog`)

## O que mudou
- **Busca de produto no servidor** (nome, SKU, código de barras...), com debounce. Antes a lista era
  carregada uma vez, limitada a 50 produtos e filtrada só pelo nome — produto fora dos 50 primeiros ou
  busca por SKU não funcionavam. O seletor mostra nome + SKU + m²/cx, e uma linha abaixo mostra SKU,
  m²/cx, peças/cx e unidade do produto escolhido.
- **+ Cadastrar produto** na linha da entrada: abre o mesmo modal de produto avulso em modo catálogo
  (`forceCatalog`, sem a opção avulso/catálogo): o produto nasce com `isAdhoc: false` e já vem
  selecionado na linha.
- **Lote obrigatório** ao adicionar (e ao editar) item. Sem lote, o usuário digita um identificador
  (ex.: nº da NF). Antes o backend gravava silenciosamente `PADRAO` quando vazio; o fallback continua
  existindo no backend para entradas geradas a partir de pedido de compra.
- **M² só com m²/caixa cadastrado** (antes, sem cobertura, o valor em m² era gravado como se fosse
  caixa, sem aviso). Conversão M² → caixas arredondada a 4 casas, eliminando o falso aviso de
  "fração de caixa" causado por ponto flutuante (ex.: 137,8 ÷ 2,65 = 52,00000000000001).
- Mensagem de busca vazia em Estoque › Produtos corrigida ("certificado" → "produto").

## Testado
Navegador + banco: busca por SKU local (`CMU-153241`), lote vazio bloqueado com mensagem, item
adicionado com lote, produto criado pela entrada com `isAdhoc = f` e selecionado automaticamente.
Dados de teste removidos. Type-check e `next build` limpos. Sem mudança de backend/schema.
