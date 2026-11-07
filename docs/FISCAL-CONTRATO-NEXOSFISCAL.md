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
  gera aviso. Antes saía como PIX. O serviço gera `tPag 90` com `vPag 0.00` no XML (a SEFAZ-MA autorizou em
  homologação), então mandar o valor total está certo.
- **Soma dos pagamentos × total da nota:** menor só avisa (a SEFAZ-MA autorizou PIX de 50,00 numa nota de
  100,00); **maior é erro** no serviço, e o ERP já bloqueia antes (pré-flight, campo `pagamento`).
- **CST padrão sem regra cadastrada:** Simples (CRT 1/2) usa `102`; Regime Normal usa `00`. O `00` para Simples é
  recusado pelo serviço.
- **Webhook:** em produção, `FISCAL_WEBHOOK_SECRET` é obrigatório e não pode ser o valor de exemplo (responde 503).
  A assinatura é comparada em tempo constante.

## Confirmado pelo NexosFiscal (2026-11-06)

- `valorUnitario` pode continuar com 2 casas: o XML recalcula o unitário (até 10 casas) a partir do total e da
  quantidade; o aviso falso de arredondamento em m² foi corrigido no serviço.
- `GET /nfe/{id}/events` devolve lista simples; `GET /nfe/events` devolve `{ data: [...] }` paginado; com o evento
  pendente, `cStat` e `motivo` são sempre nulos. O job de reconciliação aceita os dois formatos.
- `GET /nfe`: `pageSize` máximo 100 (o ERP usa 50); `updatedSince` é inclusivo (o ERP relê 2 min antes do cursor).
- `NFeCanceled`, `NFeCorrection` e `EventRejected` também trazem `Number`, `Series` e `Environment`.
- ST, redução de base, DIFAL, IPI e FCP: sem previsão; não bloqueiam o cliente atual (Simples Nacional, CSOSN 102).

## Alerta de vencimento do certificado (A16)

- **Webhook `CertificateExpiring`:** tratado em `FiscalService.handleWebhook`; o evento é da empresa, não de uma nota, então
  não tem `externalId`. Acha a loja por `ClinicFiscalConfig.nexosTenantId`. O serviço envia os campos em **PascalCase**
  (`TenantId`, `NotAfter`...); o ERP aceita também camelCase.
- **O que é guardado:** só `certificateNotAfter` e `certificateAlertAt`. Dias e nível são **recalculados ao mostrar**, com as
  mesmas faixas do serviço (`warning` 16 a 60 dias, `critical` 1 a 15, `expired` 0 ou menos), porque o aviso chega no máximo
  1x por semana e um número gravado ficaria errado. Regras em `services/certificado-alerta.ts`.
- **Onde aparece:** faixa no topo de todas as telas para quem tem `fiscal.config` (`GET /fiscal/certificate-alert`, sem
  consultar a SEFAZ). Só o aviso `warning` pode ser dispensado, até recarregar a página.
- **Como some:** enviar certificado novo limpa o aviso. `GET /fiscal/status` usa `certificado.daysLeft`/`level` e grava a
  validade real, então abrir a Configuração Fiscal corrige o aviso na hora.
- **Reentrega atrasada:** webhook com validade mais antiga que a guardada é ignorado (responde 200).
- **Limite:** o serviço só envia o evento se houver webhook cadastrado para o tenant (ver A17 abaixo) e, em produção, o
  ERP recusa o webhook sem `FISCAL_WEBHOOK_SECRET`. Sem isso, a faixa só aparece depois que alguém abre a Configuração Fiscal.

## Cadastro do webhook no serviço fiscal (A17)

- **O ERP cadastra sozinho:** `POST {FISCAL_MICROSERVICE_URL}/webhook` com a chave do tenant e
  `{ url: FISCAL_WEBHOOK_URL, secret: FISCAL_WEBHOOK_SECRET, eventType: 0 }`, em três momentos: ao **enviar o certificado**
  (tenant novo), a cada **Salvar** da Configuração Fiscal e pelo botão **Cadastrar webhook** do cartão "Avisos do serviço
  fiscal (webhook)". A chamada é idempotente no serviço (mesma URL e tipo atualiza o segredo).
- **URL de configuração, nunca fixa:** `FISCAL_WEBHOOK_URL` é o endereço público da rota `POST /fiscal/webhook` como o
  serviço a alcança. Sem ela, ou malformada, ou apontando para `localhost` em produção, o cadastro não é feito e o motivo vai
  para a tela. Produção sem segredo próprio também não cadastra (o ERP recusaria os eventos).
- **Falha aparece para o operador:** o último resultado fica em `ClinicFiscalConfig.webhookUrl/webhookRegisteredAt/webhookError`;
  salvar a configuração ou enviar o certificado mostra um aviso se o cadastro falhou, sem desfazer o resto. O cartão consulta
  `GET /webhook` do serviço e diz se o endereço deste ERP está **cadastrado e ativo**.
- Rotas do ERP: `GET /fiscal/webhook-config` (estado) e `POST /fiscal/webhook-config` (cadastrar), ambas com `fiscal.config`.
- Regras puras em `services/webhook-cadastro.ts`; o segredo é o mesmo resolvido pela rota que recebe os eventos.

## Certificado inválido barra a emissão (A18)

- O serviço devolve erro em `emitente.certificado` (sem certificado ativo, vencido, ilegível ou ainda não válido) no
  `/nfe/validate` e no `/nfe/emit` (400, sem criar nota). Perto do vencimento ou com CNPJ diferente, vem `warning`.
- Na **Revisão Fiscal** o erro aparece com a etiqueta **Certificado** e bloqueia o botão de emitir. Quem tem `fiscal.config`
  vê o botão **Enviar certificado novo**; quem não tem vê "Peça a quem cuida da configuração fiscal da loja para enviar um
  certificado digital novo." (antes recebia um botão que dava em "acesso restrito").
- Avisos que vêm junto com um 400 do `/nfe/emit` continuam avisos (antes viravam erro na tela).

## Variáveis de ambiente

| Variável | Função | Padrão |
|---|---|---|
| `FISCAL_WEBHOOK_SECRET` | Segredo HMAC do webhook (obrigatório em produção) | — |
| `FISCAL_WEBHOOK_URL` | Endereço público da rota `POST /fiscal/webhook`, cadastrado no serviço (A17) | — (sem ela, nada é cadastrado) |
| `FISCAL_RECONCILE_ENABLED` | `false` desliga o job de reconciliação | ligado |
| `FISCAL_RECONCILE_INTERVAL_MS` | Intervalo do job | 300000 (5 min) |
| `FISCAL_ALLOW_PRODUCTION` | Libera emissão em produção (sem ela, só homologação) | bloqueado |

## Como testar (homologação)

- `POST /fiscal/validate/:orderId` valida a nota sem emitir (dry-run).
- `POST /fiscal/reconcile` roda a reconciliação da loja na hora.
- Nada aqui altera o ambiente do tenant nem usa produção.
