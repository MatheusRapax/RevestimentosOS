# Custo de estoque — Custo Médio Ponderado Móvel

**Desde:** v1.13.x (branch `fix/nf-custo-valoracao`, achado F-FIN-7 do QA E2E)
**Onde:** `src/modules/stock/stock-entry.service.ts` → `confirmEntry` (passo *2c*)

---

## Resumo

Ao **confirmar uma entrada de estoque** (recebimento de NF, com ou sem pedido de compra), o sistema atualiza o custo do produto (`Product.costCents`) usando **custo médio ponderado móvel**, e não mais "último custo".

```
custoNovo = (saldoEmMãos × custoAtual + qtdEntrada × custoDaNF)
            ────────────────────────────────────────────────────
                        saldoEmMãos + qtdEntrada
```

Todos os valores em **centavos** e na **mesma unidade de estoque** do produto (caixa para produto de área, unidade para os demais).

---

## Por que mudou

### O problema (F-FIN-7)

O `confirmEntry` usava *"último custo"*: cada NF confirmada **sobrescrevia** `Product.costCents` com o custo daquela nota. Como o relatório de valoração de estoque (`GET /finance/reports/inventory-valuation`) faz `saldoTotal × Product.costCents`, uma única NF mais cara **revalorizava retroativamente todo o estoque** — inclusive o que foi comprado mais barato.

**Exemplo do bug:**
1. Compra 50 caixas a R$ 72,00 → `costCents = 7200`, valoração = 50 × 7200 = **R$ 3.600,00** ✔
2. Compra 10 caixas a R$ 90,00 → `costCents = 9000` (último custo)
3. Valoração = 60 × 9000 = **R$ 5.400,00** ✘ — as 50 primeiras caixas "viraram" R$ 90,00 do nada.

### A correção

Com custo médio móvel, o passo 2 acima resulta em:

```
(50 × 7200 + 10 × 9000) / 60 = 450000 / 60 = 7500
```

`costCents = 7500` → valoração = 60 × 7500 = **R$ 4.500,00** ✔ (o custo real do que está em mãos: 50 a 72 + 10 a 90).

---

## Por que custo médio (e não "último custo" ou PEPS)

- **Fiscalmente:** no Brasil, o custo médio ponderado móvel é o método aceito pela Receita Federal para valoração de estoque (o outro aceito é PEPS/FIFO). "Último custo" **não** é método fiscal válido.
- **Padrão de mercado:** é o default de praticamente todo ERP usado por lojas de material de construção/revestimento (SAP Business One, Omie, Bling, Tiny, etc.).
- **Comercialmente:** a margem exibida no orçamento passa a comparar o preço de venda com o **custo médio do que você tem em estoque**, não com o preço de uma NF avulsa. Se você tem 50 caixas a R$ 72 e recebe 10 a R$ 90, sua margem real não deve "cair" como se tudo custasse R$ 90.
- **PEPS/FIFO** seria ainda mais granular, mas exige **custo por lote** (`StockLot.costCents`), que hoje não existe. Fica como evolução futura opcional — para custo médio, não é necessário.

---

## Onde se aplica e onde NÃO se aplica

| Fluxo | Comportamento |
|-------|---------------|
| **Confirmar entrada de estoque** (`POST /stock/entries/:id/confirm`) | ✅ recalcula `costCents` por custo médio móvel |
| **Confirmar entrada com `forceConfirm`** (divergência de preço da NF) | ✅ idem — a NF forçada entra na média, não sobrescreve |
| Produto de **área** (m², `boxCoverage > 0`) | ✅ `costCents` continua sendo o **custo da caixa**; a média é calculada em caixas |
| Produto **unitário** | ✅ `costCents` é o custo da unidade; média em unidades |
| Item da NF **sem `unitCost`** | ➖ não mexe em `costCents` (mantém o valor atual) |
| **Importação de produtos** (`product-import.service`, `calcCostCents`, `ai-import`) | ⛔ **não tocado** — define o custo inicial no cadastro, fora deste fluxo |
| **Cálculo de orçamento / PDF** | ⛔ não tocado — apenas *lê* `Product.costCents` (agora custo médio) para exibir margem |
| **Modelo de custo por m²** | ⛔ não mudou — `costCents` continua guardando o valor da **caixa** |

Nenhuma migração de schema. Único ponto alterado: passo *2c* do `confirmEntry`.

---

## Regras de borda

| Situação | Resultado |
|----------|-----------|
| Produto **sem saldo** em mãos (`saldo = 0`) | a entrada **define** o custo (`costCents = custoDaNF`) |
| Produto com saldo mas **`costCents = 0`** (nunca precificado) | idem — a entrada define o custo |
| Vários itens da **mesma NF** para o mesmo produto | a média é aplicada item a item, em cascata (o 2º item já enxerga o saldo/custo do 1º) |
| Entrada com quantidade fracionária (ex.: 0,5 caixa) | suportado — a média usa os valores reais, arredonda só no fim (`Math.round`) |

---

## Exemplos verificados (teste `qa_custo_medio.py`, 6/6 PASS)

**Produto de área — `boxCoverage = 1.44`, custo inicial da caixa R$ 72,00 (`costCents = 7200`):**

| Passo | Entrada | Cálculo | `costCents` depois |
|-------|---------|---------|-------------------|
| 1 | 50 cx @ R$ 72 | `(0·7200 + 50·7200)/50` (saldo 0 → define) | **7200** |
| 2 | 10 cx @ R$ 90 | `(50·7200 + 10·9000)/60` | **7500** |
| 3 | 5 cx @ R$ 120 (NF forçada) | `(60·7500 + 5·12000)/65` | **7846** |

**Produto unitário — custo inicial R$ 25,00 (`costCents = 2500`):**

| Passo | Entrada | Cálculo | `costCents` depois |
|-------|---------|---------|-------------------|
| 1 | 100 un @ R$ 25 | saldo 0 → define | **2500** |
| 2 | 20 un @ R$ 40 | `(100·2500 + 20·4000)/120` | **2750** |

---

## Impacto observável para o usuário

- **Valoração de estoque** (`/dashboard/financeiro` → "Valor em Estoque") passa a mostrar o custo real do saldo, não o preço da última nota.
- **Margem no orçamento** passa a usar custo médio. Uma NF pontual mais cara empurra a média **proporcionalmente à quantidade**, em vez de fazer a margem despencar.
- Uma NF com preço divergente, mesmo confirmada à força, **não "contamina"** o custo de todo o estoque anterior.

---

## Evolução futura (opcional, não implementado)

- **`StockLot.costCents`** (custo por lote) — habilitaria valoração PEPS/FIFO e rastreio fiscal lote a lote. Requer migração. Para custo médio, não é necessário.
- Registrar o histórico de custo médio (tabela de "kardex") para auditoria da evolução do custo ao longo do tempo.
