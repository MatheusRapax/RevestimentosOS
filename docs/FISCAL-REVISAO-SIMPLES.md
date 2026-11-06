# Revisão fiscal em linguagem simples

**Branch:** `feat/fiscal-revisao-simples`
**Onde:** `clinicos-web/src/app/dashboard/pedidos/components/FiscalReviewModal.tsx`,
`.../FastInputModal.tsx`, `clinicos-web/src/components/fiscal/ncm-picker.tsx`,
`clinicos-web/src/lib/fiscal-labels.ts`; backend em `src/modules/fiscal/services/fiscal.service.ts`.
**Testes:** `src/modules/fiscal/services/fiscal-revisao.spec.ts`.

## Problema

O cliente da loja não conhece código fiscal. A tela de emissão mostrava CFOP, CST e NCM como número,
pedia que o operador digitasse CFOP/CST de cabeça (valores que o motor de regras já calcula) e os erros
traziam nomes técnicos (`item.ncm`, `cliente.state`).

## O que mudou

1. **Tipo de operação calculado, nunca perguntado.** A revisão mostra “Venda dentro do estado (MA → MA)” ou
   “Venda para outro estado (MA → SP)”. Sai da comparação UF do emitente × UF do cliente
   (`CfopResolverService`); a SEFAZ rejeita CFOP que não bate com a UF de destino, por isso não é escolha.
2. **Impostos em reais.** A tabela mostra Produto, Qtd, Valor total e “Impostos na nota” (ICMS + PIS + COFINS,
   ou “Sem destaque” quando o regime não destaca, como no Simples Nacional).
3. **Códigos recolhidos.** NCM, CFOP, CST e alíquotas ficam em “Ver detalhes fiscais (códigos)”, visível só
   para quem tem `fiscal.config` (ou super admin).
4. **Erros por responsável.** Etiquetas `Cliente`, `Produto`, `Empresa`, `Pedido`, `Valores` em vez do nome
   técnico do campo (que continua no tooltip). Mensagens usam o nome do produto.
5. **Dados fiscais do produto = só NCM + origem.** O formulário (“Faltam dados fiscais nos produtos”) tem:
   seletor de NCM (atalhos de revestimento conferidos na tabela oficial, busca por nome e digitação do
   número, conferida na BrasilAPI) e origem **sem valor padrão** (escolha obrigatória: “nacional” por engano
   num porcelanato importado muda o imposto). GTIN e CEST ficam em “Mais dados (opcionais)”.
6. **CFOP e CST deixam de ser exigidos do produto.** O payload já usava o motor de regras; o pré-flight e o
   `MISSING_FISCAL_DATA` ainda exigiam os campos do cadastro. O endpoint `PATCH /stock/products/batch-fiscal`
   aceita `cfop`/`cst` como opcionais (compatibilidade).

## Proteções (o que o sistema recusa de propósito)

- **Sem UF padrão.** `buildEmitPayload` não usa mais `|| 'SP'` (UF do emitente, UF do cliente, município de
  São Paulo). Faltando UF/cidade/IBGE, o pré-flight bloqueia com instrução de corrigir o cadastro. Antes,
  uma loja do MA com cliente sem estado emitiria como se fosse venda local em SP.
- **Cliente sem estado ou sem cidade:** erro claro (`cliente.state`, `cliente.city`), com atalho “Editar Cliente”.
- **Sem validação remota em cima de erro local.** `validateOrder` só chama o NexosFiscal quando o pré-flight
  local passa, evitando mensagens duplicadas em inglês.
- **Trava de homologação** continua valendo para qualquer emissão (`FISCAL_ALLOW_PRODUCTION`).

## Escolhas de projeto

- **Dentro/fora do estado não tem botão de trocar.** Operações diferentes (devolução, remessa, bonificação)
  entram no futuro como “natureza da operação”, restritas a quem tem permissão fiscal
  (ver `docs/FISCAL-PENDENCIAS.md`).
- Os atalhos de NCM são **sugestão**: o contador do cliente decide. O de argamassa/rejunte (3214.90.00) está
  marcado “confirme com o contador”.
- A busca na tabela oficial usa termos técnicos (“porcelanato” não retorna nada; “ladrilhos” retorna), por isso
  existem os atalhos.

## Como testar (local)

1. Pedido sem nota, cliente com estado, cidade e IBGE; produto sem NCM ou origem → `Emitir Nota` →
   `Preencher Dados e Emitir` → escolher classificação e origem.
2. Cliente sem estado/cidade → revisão bloqueia com etiqueta **Cliente** e “Editar Cliente”.
3. Cliente de outro estado → cartão “Venda para outro estado”.
4. Usuário sem `fiscal.config` → não vê “Ver detalhes fiscais”.
