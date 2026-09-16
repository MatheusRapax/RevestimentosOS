# Precificação por Markup — recálculo automático e atualização em orçamento

**Desde:** branch `fix/orcamento-markup-recalculo`
**Onde:** `src/modules/catalogue/services/pricing.service.ts` (motor de cálculo e recálculo em lote),
`brands.service.ts` / `categories.service.ts` / `clinics.service.ts` (gatilhos), `quotes.service.ts`
→ `refreshPrices` (atualização em orçamento)

---

## Resumo

O preço de venda de um produto (`Product.priceCents`), quando não digitado manualmente, vem de:

```
priceCents = costCents × (1 + markup / 100)
```

O `markup` usado é o primeiro que existir, nesta ordem de prioridade:

```
Product.markup  →  Brand.defaultMarkup  →  Category.defaultMarkup  →  Clinic.globalMarkup
```

Produto com `manualPrice: true` nunca entra nessa conta — o preço digitado nele é sempre o que vale,
mesmo que o markup da marca/categoria/loja mude.

Isso já existia. O que não existia: **mudar o markup de uma marca, categoria ou da loja nunca
recalculava os produtos já cadastrados.**

---

## Por que mudou

### O problema

Relato de cliente: mudou o markup padrão de uma marca, e os produtos daquela marca continuaram com
o preço antigo — mesmo criando um orçamento novo. Investigando:

- `Product.priceCents` é um valor **gravado no banco**, calculado (quando não veio manual) só no
  momento da criação do produto.
- `BrandsService.update`, `CategoriesService.update` e `ClinicsService.updateClinic` faziam um
  `prisma.update()` simples na marca/categoria/loja — nenhum dos três tocava nos produtos.
- Resultado: o `priceCents` gravado só refletia o markup vigente **no dia em que o produto foi
  cadastrado**. Qualquer ajuste de markup depois disso era invisível para o catálogo inteiro.

### A correção

`PricingService.recalculatePrices(clinicId, where)`:

1. Busca os produtos afetados (`where` + `clinicId` + `manualPrice: false` + `isActive: true` +
   `costCents` preenchido).
2. Para cada um, recalcula o preço pela mesma hierarquia de sempre (produto → marca → categoria →
   global).
3. Só grava quem realmente mudou de preço (evita updates/auditoria desnecessários).

Chamado depois de:
- `BrandsService.update` quando `dto.defaultMarkup` é enviado → recalcula só os produtos daquela marca.
- `CategoriesService.update` quando `dto.defaultMarkup` é enviado → recalcula só os da categoria.
- `ClinicsService.updateClinic` quando `data.globalMarkup` é enviado → recalcula a loja inteira
  (produtos com override de marca/categoria/produto continuam resolvendo para o mesmo valor de
  antes — recalcular todo mundo é seguro, só quem depende do markup global muda de fato).

```ts
// Exemplo: markup de uma marca sobe de 30% para 50%
// Produto com costCents=10000, sem markup próprio, sem preço manual:
// antes:  priceCents = 10000 * 1.30 = 13000
// depois: priceCents = 10000 * 1.50 = 15000  (gravado automaticamente ao salvar a marca)
```

---

## Orçamento em rascunho — preço não acompanha o catálogo sozinho

Mesmo com o catálogo corrigido, um **orçamento já criado** continuava com o preço antigo: a tela de
edição carrega `unitPriceCents` do que já estava salvo no próprio orçamento, nunca do preço atual do
produto — e isso é proposital, não um bug adicional. `unitPriceCents` pode ser um preço negociado à
mão com o cliente; se o sistema sobrescrevesse sozinho toda vez que o orçamento fosse reaberto (para
qualquer edição, nem que fosse só corrigir a data de validade), um preço combinado no boca a boca
sumiria sem aviso.

**Decisão (confirmada com o usuário):** ação explícita, não automática.

- `POST /quotes/:id/refresh-prices` — só em orçamentos `EM_ORCAMENTO` (mesma trava de
  `update`/`updateItem`; um orçamento já enviado/aprovado não pode ter preço trocado por baixo).
  Para cada item, busca o preço atual do produto (via `StockService.findOne`, que já resolve
  markup + promoção ativa), atualiza `unitPriceCents`/`discountCents`/`totalCents` do item e
  recalcula os totais do orçamento. Retorna `{ updatedCount, changes[], quote }` para a tela
  mostrar o que mudou.
- Botão **Atualizar Preços** no topo da tela `/dashboard/orcamentos/[id]/editar` — chama o endpoint
  acima e substitui os itens localmente pelo retorno; o vendedor ainda precisa clicar em
  **Atualizar Orçamento** para gravar.

---

## Achado de segurança (corrigido de passagem)

`BrandsService`/`CategoriesService` (`findOne`, `update`, `remove`) faziam
`prisma.brand/category.update({ where: { id } })` — **sem** filtrar por `clinicId`. Qualquer usuário
autenticado de qualquer loja podia editar ou excluir a marca/categoria de **outra loja**, só sabendo
o `id` (não precisa nem adivinhar — UUIDs de outras lojas vazam facilmente por outras respostas de
API). Corrigido com `findFirst({ where: { id, clinicId } })` antes de qualquer `update`/`remove`,
lançando `NotFoundException` quando não pertence à clínica do usuário.

---

## Testado

- Marca com markup 30% → 50% → 80% → 60%: produto (`costCents = 10000`, sem markup próprio, sem
  preço manual) recalculado a cada mudança e **gravado no banco** (confirmado via query direta ao
  Postgres, não só na resposta da API) — `13000 → 15000 → 18000 → 16000` (bate com `10000 × (1 +
  markup/100)` em cada caso).
- Produto com `manualPrice: true` no valor `19999`: **nunca** mudou, mesmo com a marca subindo o
  markup para 80%.
- Tela de Marcas (`/dashboard/admin/catalogo/marcas`) → editar markup → catálogo de produtos
  (`/dashboard/vendas/catalogo`) mostra o preço novo automaticamente, sem tocar no produto.
- Orçamento criado com preço propositalmente desatualizado (R$ 120,00) → markup do produto sobe
  para um valor que resolveria R$ 200,00 → botão **Atualizar Preços** na tela de edição → item e
  totais do orçamento passam para R$ 200,00 / R$ 600,00 (3 caixas) → **Atualizar Orçamento** →
  conferido persistido na tela de detalhe do orçamento.
- `POST /quotes/:id/refresh-prices` num orçamento já enviado (`AGUARDANDO_APROVACAO`) → `400`
  controlado, não deixa passar.
- Regressão: `brands`/`categories` CRUD completo (criar/editar/excluir) continua funcionando pela
  tela normalmente depois do filtro por `clinicId`.
