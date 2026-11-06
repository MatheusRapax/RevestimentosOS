# Teste ponta a ponta em homologação (2026-11-06)

Branch `feat/fiscal-contrato-nexos`. Somente homologação, tenant MOSAIC ACABAMENTOS LTDA (CNPJ 42580788000100, MA,
Simples Nacional). Ambiente do tenant não foi alterado; nada em produção. Notas de homologação não têm valor fiscal.

**Como foi feito:** clientes, produtos (rota `batch-fiscal` da janela “Faltam dados fiscais”), orçamento → aprovar →
converter → pagamento, e emissão/cancelamento pelas rotas do ERP que a tela usa; telas conferidas no navegador.
Webhook cadastrado no NexosFiscal: `POST /api/v1/webhook` → `http://host.docker.internal:3000/fiscal/webhook`
(eventType 0). O segredo usado é o do `.env` de desenvolvimento.

| Caso | Pedido | Resultado | Evidência |
|---|---|---|---|
| A contribuinte, PIX | #41 | OK | nº 12, protocolo 421260000069146; XML: `indIEDest 1`, IE 127075453, `orig 0`, `tPag 17`, `vNF 380,00`, `infCpl` do pedido |
| B desconto + frete + cartão | #42 | OK | nº 13, prot. 421260000069147; `tPag 03`, `vFrete 30,00`, `vDesc 50,00`, `vNF 360,00` |
| C sem pagamento aprovado | #47 | OK | nº 17, prot. 421260000069151; `tPag 90`, `vPag 0,00`, aviso no pré-flight |
| D importado | #44 | OK | nº 15, prot. 421260000069149; `orig 2` |
| E1 CPF | #45 | OK | nº 16, prot. 421260000069150; `indIEDest 9`, CPF no XML, `tPag 04` |
| E2 PJ contribuinte sem IE | #46 | OK | barrado no pré-flight com mensagem clara, nenhuma nota criada |
| F erro de validação (400) | #48 | OK após correção | `itens[0].cest: CEST com 7 dígitos.` na revisão e no card |
| G cancelamento | #41 | OK | “em andamento” ao 202; webhook `NFeCanceled` → CANCELADA em 4 s; evento cStat 135, prot. 421260000069152 |
| H webhook perdido | #50 | OK | com segredo errado a nota ficou “em processamento”; o job corrigiu em 4 min 19 s |
| I espera da SEFAZ | #51 (simulado) | OK | `NFeDelayed` → “Aguardando a SEFAZ”; `NFeAuthorized` resolve; FAILED/AWAITING_SEFAZ via reconciliação com serviço simulado |
| J carta de correção (A5) | — | NÃO TESTADO | não implementada no ERP |

## Bugs do ERP achados e corrigidos

1. O 400 do serviço em formato ProblemDetails (`errors{}`) não era lido: o operador via “Request failed with status code 400”.
2. Mensagens do serviço que vêm como texto puro (404/409) eram ignoradas.
3. Card da nota não mostrava a série; aviso de espera repetia a frase padrão.
4. Erro de item do serviço não dizia de qual produto era.

## Limitação do NexosFiscal registrada

`POST /nfe/emit` devolve o 400 de formato de campo como ProblemDetails (`errors`), diferente do `{ message, erros[] }`
documentado; e 404/409 com corpo de texto puro. O ERP já trata os formatos.

## Dados de teste deixados no banco local do ERP

Clientes “… (E2E)”, pedidos #41 a #51 (o #51 é uma nota simulada, sem existir no serviço), notas de homologação e NCM/origem
nos produtos “Argamassa CM 163632” e “Argamassa CM 163147”.
