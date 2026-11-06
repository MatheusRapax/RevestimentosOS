# Integração com o NexosFiscal — contrato e o que o ERP faz

**Fonte do contrato:** `../NexosFiscal/docs/AJUSTES_ERP.md` (itens A1 a A13), `API_REFERENCE.md` e `WEBHOOKS.md`.
**Branch:** `feat/fiscal-contrato-nexos`. **Onde:** `src/modules/fiscal/`.
Quando o contrato mudar, o NexosFiscal registra em `AJUSTES_ERP.md` e este doc é atualizado junto.

## Resumo por item

| Item | O que o ERP faz | Arquivo |
|---|---|---|
| A1 campos do payload | Envia `indicadorIe`/`ie` do cliente, `complemento`, `origem` em ICMS/PIS/COFINS, `gtin` válido, `desconto` (vDesc), `informacoesComplementares` (observações) e o **meio de pagamento real** | `nfe-payload.ts`, `fiscal.service.ts` |
| A2 validação rígida | Bloqueia CST/CSOSN que o serviço não emite (lista por CRT), avisa quando ST/DIFAL/IPI/FCP foram calculados mas não são transmitidos; mostra `erros[]` do 400 na revisão | `cst-suportados.ts` |
| A3 cancelamento | `POST /fiscal/documents/:id/cancel`; a nota segue autorizada com “cancelamento em andamento” até o webhook | `fiscal.service.ts` (`cancelarNota`) |
| A4 webhook | Evento sem efeito ou desconhecido responde 200 e não altera nada; `EventRejected` guarda o motivo por tipo | `nexos-status.ts` (`planejarWebhook`) |
| A7 reconciliação | Job a cada 5 min lê `GET /nfe?updatedSince=` e corrige o que o webhook perdeu; guarda série, número e ambiente | `fiscal-reconciliation.service.ts` |
| A9 status | `FAILED` vira rejeitada; `PENDING`/`PROCESSING`/`AWAITING_SEFAZ` ficam “em andamento” | `nexos-status.ts` (`mapearStatusNexos`) |
| A11 resiliência | `AWAITING_SEFAZ` = em andamento (nunca erro); `NFeDelayed` guarda o aviso; `POST /fiscal/documents/:id/retry` | `fiscal.service.ts` (`tentarNovamente`) |
| A12 dados no webhook | Guarda `Number`, `Series` e `Environment`; homologação aparece como “sem valor fiscal” | `nexos-status.ts` |
| A5 carta de correção, A6 inutilização | **Não implementados** (ver `FISCAL-PENDENCIAS.md`) | — |
| A8 perfil do emitente | Tratado à parte (`syncTenantFromProfile`) | — |

## Campos novos no banco (`FiscalDocument`)

`environment`, `cancelEventId`, `cancelRequestedAt`, `cancelJustification`, `eventError`, `eventErrorType`,
`remoteStatus` (status bruto: AUTHORIZED, AWAITING_SEFAZ, FAILED…), `statusDetail`. Em `ClinicFiscalConfig`:
`lastReconciledAt`. Migrações aditivas `20261106010000_*` e `20261106120000_*`.

## Regras que valem a pena lembrar

- **O serviço é a fonte da verdade do status**, com três travas: nota cancelada não volta atrás; nota autorizada
  não é rebaixada por leitura atrasada; erro de comunicação (`AWAITING_SEFAZ`) nunca vira rejeição.
- **`totalCents` do pedido já inclui o frete** (`subtotal − desconto + frete`). O pagamento enviado é o total do
  pedido; somar o frete de novo (como era antes) fazia a nota divergir quando havia frete.
- **Pedido sem pagamento aprovado** vai como `SEM_PAGAMENTO` com valor total (o serviço recusa lista vazia) e
  gera aviso. Antes saía como PIX.
- **CST padrão sem regra cadastrada:** Simples (CRT 1/2) usa `102`; Regime Normal usa `00`. O `00` para Simples é
  recusado pelo serviço.
- **Webhook:** em produção, `FISCAL_WEBHOOK_SECRET` é obrigatório e não pode ser o valor de exemplo (responde 503).
  A assinatura é comparada em tempo constante.

## Variáveis de ambiente

| Variável | Função | Padrão |
|---|---|---|
| `FISCAL_WEBHOOK_SECRET` | Segredo HMAC do webhook (obrigatório em produção) | — |
| `FISCAL_RECONCILE_ENABLED` | `false` desliga o job de reconciliação | ligado |
| `FISCAL_RECONCILE_INTERVAL_MS` | Intervalo do job | 300000 (5 min) |
| `FISCAL_ALLOW_PRODUCTION` | Libera emissão em produção (sem ela, só homologação) | bloqueado |

## Como testar (homologação)

- `POST /fiscal/validate/:orderId` valida a nota sem emitir (dry-run).
- `POST /fiscal/reconcile` roda a reconciliação da loja na hora.
- Nada aqui altera o ambiente do tenant nem usa produção.
