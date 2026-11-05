# Fiscal — pendências e melhorias futuras

Levantado em 2026-11-05, ao revisar o que o ERP tem de regras de emissão frente ao que ERPs de mercado
(Bling, Tiny, Omie, TOTVS) oferecem. Nada abaixo bloqueia **homologação**; vários itens bloqueiam
**produção**. Enquanto a lista não for atendida, o servidor mantém a trava `FISCAL_ALLOW_PRODUCTION`
(ver `docs/` e `.env.example`).

## Antes de liberar produção (bloqueantes)

- [ ] **Cancelamento de NF-e pela tela.** Existe a permissão `fiscal.cancel`, mas não há endpoint nem botão;
      o status "cancelada" só chega pelo webhook do NexosFiscal (`NFeCanceled`). Respeitar o prazo legal
      (em geral 24h da autorização; varia por UF) e exigir justificativa (mín. 15 caracteres).
- [ ] **Substituição tributária (ST) e CFOP 5405.** `CfopResolverService` só resolve 5102, 6102 e 6108.
      Produto sujeito a ST (revestimento cerâmico é, em vários estados) sairia com CFOP/CST errados.
      Definir com o contador: ST por produto/UF, CEST obrigatório, CST 60 / CSOSN 500, MVA, DIFAL.
- [ ] **Alíquotas reais.** As regras de ICMS/PIS/COFINS do seed são genéricas (seed `fiscal-rules`).
      Revisar com o contador por regime (CRT) e por UF antes de qualquer nota real.
- [ ] **Alerta de vencimento do certificado A1** (válido por 1 ano). Hoje só mostramos a data do envio.
      Mostrar validade/dias restantes e avisar com antecedência (ver GET `/sefaz/status` do NexosFiscal).
- [ ] **Confirmação explícita ao ligar produção** (modal com o CNPJ e a frase de confirmação), além da
      trava de servidor. Registrar quem liberou, quando e por quê (auditoria).

## Recursos de ERP fiscal completo (importantes, mas não bloqueiam produção)

- [ ] **Carta de Correção (CC-e).**
- [ ] **Inutilização de numeração** (buracos de série/número) e relatório de sequência.
- [ ] **Contingência** (SVC-AN/SVC-RS) quando a SEFAZ do estado cai.
- [ ] **Manifestação do destinatário** e consulta de NF-e de entrada (compras).
- [ ] **NF-e de entrada/devolução de compra** e outras naturezas (bonificação, remessa, consignação,
      transferência). `CfopResolverService` hoje cobre só VENDA e DEVOLUCAO_VENDA.
- [ ] **NFC-e** (venda a consumidor no balcão) — hoje só NF-e modelo 55.
- [ ] **Guarda e exportação dos XMLs** (obrigação de 5 anos; pacote mensal para o contador).

## Dívidas conhecidas do que já existe

- [ ] Os campos "padrão" de **NCM, CEST e Classe de Imposto** (Regras de Emissão) são só guardados:
      não são usados na emissão. Ou passam a ser usados (pré-preencher produto) ou saem da tela.
      O **CFOP/CST padrão** só entram nas entradas de estoque com "Atualizar dados fiscais".
- [ ] Setup do certificado **cria um tenant novo a cada clique** no NexosFiscal. Deveria reaproveitar o
      tenant existente quando só o certificado muda.
- [ ] `GET /settings` e `PATCH /settings` (Configurações Globais): PATCH já exige `clinic.settings.manage`;
      conferir se outros controllers só com `TenantGuard` precisam de permissão.
- [ ] Usuários: faltam desativar/reativar na tela e o bloqueio efetivo de acesso (ver stash
      `wip usuarios-desativar backend`).
- [ ] Filtros e paginação na tela de Auditoria (hoje: 100 últimos, sem filtro).
