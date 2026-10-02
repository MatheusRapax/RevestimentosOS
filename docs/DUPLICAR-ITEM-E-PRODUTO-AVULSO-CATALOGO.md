# Duplicar item do orçamento + produto avulso direto no catálogo + busca no manual

**Desde:** branch `feat/orcamento-duplicar-item-e-produto-avulso-real`
**Onde:** `clinicos-web/src/app/dashboard/orcamentos/novo/page.tsx` e
`orcamentos/[id]/editar/page.tsx` (duplicar item), `clinicos-web/src/components/products/ad-hoc-product-modal.tsx`
(produto avulso → catálogo), `clinicos-web/src/app/dashboard/ajuda/page.tsx` (busca e navegação do manual)

---

## 1. Duplicar item dentro do orçamento

Botão de duplicar (ícone de cópia) ao lado do botão de excluir, em cada item das telas
`/dashboard/orcamentos/novo` e `/dashboard/orcamentos/[id]/editar`. Copia produto, quantidade,
desconto, ambiente e lote preferencial do item, inserindo a cópia logo abaixo do original — útil para
repetir um item parecido (ex.: mesmo produto em outro ambiente) sem preencher tudo de novo.

Na tela de edição, a duplicata nunca carrega o `id` do item original: ao salvar, ela é sempre criada
como item novo (`POST /quotes/:id/items`), nunca sobrescreve o item que foi copiado. Confirmado via
banco de dados que duplicar um item já salvo e clicar em "Atualizar Orçamento" gera uma linha
`QuoteItem` com `id` próprio, mantendo as três linhas (original + duplicata + item seguinte)
re-sequenciadas corretamente.

## 2. Produto avulso — opção de já nascer no catálogo

O modal "Produto Extraordinário" (aberto por `+ Produto Avulso` na tela de orçamento) sempre criou o
produto com `isAdhoc: true` — oculto do catálogo e de buscas em outros orçamentos, só podendo ser
"promovido" depois por um admin (`PromoteAdhocDialog`, em Estoque › Produtos).

Agora o modal tem um checkbox **"Adicionar direto ao catálogo"** (desmarcado por padrão — comportamento
de hoje preservado). Marcando antes de salvar, o produto é criado com `isAdhoc: false` diretamente —
mesmo caminho que um produto cadastrado normalmente pelo catálogo, usando o mesmo endpoint
(`POST /stock/products`) e os mesmos critérios de busca (`where.isAdhoc = false` por padrão em
`stock.service.ts`). Não existe modo intermediário nem necessidade de alterar o backend: o campo já
existia e já era respeitado nas buscas — a mudança é só dar a opção de escolher o valor na hora de criar,
em vez de forçar sempre `true` e exigir uma promoção manual depois.

## 3. Manual do Operador — busca e navegação

O manual já tinha um índice fixo na lateral (só em telas largas, `lg:block`), sem nenhuma forma de
busca. Adicionado:

- **Campo de busca** no topo da página, filtra módulos e fluxos por título, caminho (breadcrumb) e
  pelo rótulo de cada nota dentro do módulo (ex.: buscar "duplicar" encontra "Orçamentos" porque o
  módulo tem uma nota chamada "Duplicar item", mesmo sem "duplicar" aparecer no título). Busca
  tolerante a acento (`normalize` remove diacríticos antes de comparar). A busca filtra ao mesmo tempo
  o índice (lateral e mobile) e o conteúdo da página — só os módulos/fluxos que batem aparecem,
  com estado vazio dedicado quando nada bate.
- **Índice também em telas estreitas**: antes o índice (`<nav>`) só existia a partir do breakpoint
  `lg`; em telas menores não havia nenhuma forma de navegar sem rolar a página inteira. Agora um
  `<details>` recolhível ("Índice do manual") logo abaixo da busca cobre mobile/tablet, reaproveitando
  a mesma lista de links (`ManualNavList`) e os mesmos resultados filtrados pela busca.

---

## Testado

- Duplicar item na tela "Novo Orçamento": item copiado idêntico (produto, 5 caixas, R$ 190,00),
  inserido logo abaixo, orçamento salvo com 2 `QuoteItem` distintos no banco (ids diferentes).
- Duplicar item já salvo na tela de edição: nova linha criada com `id` próprio ao salvar: 3 itens no
  banco, nenhum sobrescrito, sequência recalculada (`0, 1, 2`) corretamente.
- Produto avulso com o checkbox marcado: criado com `isAdhoc = false` no banco, e imediatamente
  encontrado na busca de produto de um orçamento novo e diferente (sem precisar de promoção manual).
- Produto avulso com o checkbox desmarcado (padrão): continua criado com `isAdhoc = true` — regressão
  do comportamento original confirmada sem mudanças.
- Busca do manual testada em viewport mobile (<1024px, índice recolhível) e desktop (≥1024px, índice
  fixo na lateral): busca por "desconto" e "markup" encontra módulos pelo título; busca por
  "duplicar" encontra "Orçamentos" só pelo rótulo da nota; busca por "nota fiscal" encontra o módulo
  e o fluxo completo correspondente ao mesmo tempo; busca sem nenhum resultado mostra o estado vazio
  dedicado tanto no índice quanto no conteúdo.
- Backend (`nest build`) e frontend (`next build`, 60 páginas) — build de produção limpo.
