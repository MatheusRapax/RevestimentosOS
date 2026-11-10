# Filtro “com estoque” (Estoque e Catálogo de Vendas)

**Pedido do cliente (2026-11-10):** ver de forma rápida só os produtos que têm estoque, na tela de Estoque e também no
Catálogo de Vendas, que é a única vitrine do vendedor (ele não acessa a tela de Estoque).
**Versão:** 1.22.0.
**Onde:** regra em `src/modules/stock/services/stock-availability.ts`, consulta em `StockService.listProducts`
(`GET /stock/products` e `GET /stock`, parâmetro `status`). Telas: `clinicos-web/src/app/dashboard/estoque/page.tsx`
(botão **Com estoque**) e `clinicos-web/src/app/dashboard/vendas/catalogo/page.tsx` (botão **Só com estoque**).

## Como funciona

- **Disponível = estoque dos lotes com saldo − reservas ativas desses lotes.** É a mesma conta da coluna “Disponível”
  e dos selos da tela de Estoque. Produto com estoque, mas todo reservado para outros pedidos, **não** aparece em “com
  estoque”.
- **Catálogo:** o botão **Só com estoque** fica ao lado da busca e aplica na hora, junto com a busca e os demais filtros
  (que continuam pedindo “Aplicar Filtros”). “Limpar Filtros” desliga o botão. Lista vazia com o botão ligado explica o
  motivo e oferece “Mostrar também sem estoque”. O vendedor **não vê quantidades** no cartão; só filtra. As quantidades
  continuam em “Ver Especificações”, como antes.
- **Estoque:** botão **Com estoque** junto de Todos / Baixa Disp. / Indisponível.

## Valores do parâmetro `status`

| Valor | Traz | Botão |
|---|---|---|
| `available` | qualquer saldo disponível acima de zero (inclui os que estão no mínimo ou abaixo) | Com estoque / Só com estoque |
| `in_stock` | disponível acima do estoque mínimo | — |
| `low_stock` | disponível acima de zero, mas no mínimo ou abaixo | Baixa Disp. |
| `out_of_stock` | sem saldo disponível (sem lote com saldo ou tudo reservado) | Indisponível |

Qualquer outro valor é recusado com 400.

## Correção junto (filtros que já existiam)

Antes, “Baixa Disp.” e “Em estoque” eram filtrados **depois** de carregar a página: vinham páginas com menos itens e o
total não batia. “Indisponível” olhava só o estoque físico (ignorava reservas) e “Baixa Disp.” usava o físico, enquanto
os selos da tela usavam o disponível. Agora os quatro filtros rodam **no banco, antes da paginação** (uma consulta soma o
saldo disponível por produto e o resultado vira um filtro por `id`), e seguem a mesma conta dos selos.

## Testes

- `src/modules/stock/services/stock-availability.spec.ts`: classificação (igual aos selos), quantidades fracionadas
  (m²), resto de arredondamento, filtro aplicado antes da paginação com o total certo, busca por texto junto e consulta
  sempre da loja da requisição.
- Ao vivo (2026-11-10, base local): para os quatro valores, a API trouxe exatamente os produtos calculados direto no
  banco; paginação de 7 em 7 com páginas cheias e total 30; vendedor filtrando no catálogo (33 → 30 produtos); produto
  com 120 em estoque e 140 reservados ficou fora de “com estoque”.

## Limites conhecidos

- Reserva com status ativo, mas já vencida, ainda conta como reservada (mesma regra que a tela já usava).
- O botão do catálogo não fica lembrado ao sair da tela; volta desligado.
