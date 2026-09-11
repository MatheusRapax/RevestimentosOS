# Plano — Padrão fiscal correto (ERP ⟷ NexosFiscal)

> **Status (2026-09-11):** Passos 1–6 da ordem sugerida abaixo estão ✅ **implementados e
> testados** — `FiscalProfile` + campos fiscais de `Customer`/`Product` (Fase 0.1/0.2/0.3),
> pré-flight forte + `POST /fiscal/validate/:orderId` (Fase 2.1/2.2), motor de CFOP + tax
> calculator (Fase 1) rodando sobre as tabelas `RegraIcms`/`RegraPisCofins`/`RegraIpi` com seed
> genérico (Fase 0.4), e a tela de revisão fiscal com preenchimento rápido e acesso à
> Configuração Fiscal (Fase 2.3). Relatório completo de QA end-to-end em
> `docs/QA-FISCAL-FINDINGS.md` (4 bugs achados e corrigidos, commit `8b54dc0`).
>
> **Pendente:** Fase 2.4 (fluxo de rejeição/reemissão — ver nota abaixo sobre reemissão
> permanecer travada por `externalId` no NexosFiscal, mesmo já corrigida a sincronização de
> status no ERP), importador de tabela NCM oficial, tabela real de alíquotas (a seed atual é
> **genérica/placeholder**, sinalizada para revisão contábil), e NFC-e (modelo 65, não
> implementado — só modelado nos campos).

Objetivo: sair do estado atual (dados fiscais chumbados, CFOP fixo por produto, validação só
de formato) para um emissor de NF-e sólido, com **flexibilidade para o operador** e **validação
antes de enviar**.

> **Divisão de responsabilidade**
> - **ERP (`RevestimentosOS`)** = dados mestres + motor de regras fiscais (CFOP, tributação) +
>   tela de revisão + pré-flight contra os próprios dados.
> - **NexosFiscal** = validação estrutural/XSD/regras de schema + assinatura + transmissão SEFAZ
>   + eventos. Expõe `POST /api/v1/nfe/validate` (dry-run) — já implementado.
>
> **Não duplicar no ERP:** conhecimento de XSD, layout do XML, regras que só a SEFAZ conhece.
> Isso fica no NexosFiscal; o ERP consome o `validate`.

O que já está pronto do lado NexosFiscal (não precisa mexer):
- `POST /api/v1/nfe/validate` — valida formato (recursivo) + regras de negócio dependentes do
  tenant (cMun⟷UF, direção do CFOP, `valorTotal` ≈ `qtd × unit`, CST⟷CRT, fechamento de totais,
  ambiente). Responde `200 { valido, erros:[{campo, mensagem, severidade}] }`.
- `POST /api/v1/nfe/emit` roda o **mesmo** pré-flight; se houver `severidade: "error"`, responde
  `400 { message, erros[] }` e não enfileira.
- Ver `NexosFiscal/docs/API_REFERENCE.md` (seção "Validar NF-e (dry-run)").

---

## Fase 0 — Dados mestres (ERP)

### 0.1 Perfil fiscal do emitente

Hoje `ClinicFiscalConfig` só guarda `nexosTenantId`, `nexosApiKey`, `environment` e uns defaults.
Expandir (ou criar `FiscalProfile` 1:1 com `Clinic`):

| Campo | Uso |
|---|---|
| `cnpj`, `ie`, `im` | identidade do emitente |
| `crt` (1=Simples, 2=SN excesso, 3=Normal) | decide CST vs CSOSN, cálculo de ICMS |
| `regimeTributario` (detalhe do CRT) | |
| `logradouro, numero, complemento, bairro` | endereço do emitente |
| `municipioIbge` (7 díg), `municipioNome`, `uf`, `cep` | **cMun tem que casar com a UF** |
| `cnae` | |
| `serieNfe`, `serieNfce` | série corrente por modelo |
| `cscId`, `cscToken` | NFC-e (se for emitir) |
| `ambiente` (homologacao/producao) | |

> Migrar os dados fiscais da loja para cá; remover o `codigoMunicipio: '3550308'` chumbado em
> `fiscal.service.ts` e passar a ler do perfil.

### 0.2 Produto — campos fiscais

`Product` já tem `ncm, cest, cfop, cst, origin, taxClass`. Ajustes:

- **`cfop` deixa de ser usado diretamente** — vira, no máximo, um "CFOP sugerido" para operação
  padrão (venda no estado). O CFOP real sai do motor (Fase 1).
- `ncm` — validar 8 dígitos e (idealmente) contra a tabela oficial (arquivo da Receita, importável).
- `origin` — obrigatório (0 a 8).
- `unidadeTributavel` + `fatorConversao` (comercial → tributável). Ex.: vende em `M2`, tributa em `M2`;
  ou vende em `CX` e tributa em `UN` com fator.
- `gtin` (EAN) — usar "SEM GTIN" quando não houver (a SEFAZ exige o literal).
- **`perfilTributario`** — referência a uma regra/classe (Fase 0.4), não alíquota fixa.

### 0.3 Cliente — campos fiscais

`Customer` precisa de:

- `tipoPessoa` (PF | PJ | ESTRANGEIRO)
- `ie` + **`indicadorIe`** (1=Contribuinte, 2=Isento, 9=Não contribuinte) — vira `indIEDest` no XML
- `municipioIbge` (7 díg) — hoje o ERP chuta `'3550308'` para todo mundo
- `pais` (default 1058 - Brasil)
- `consumidorFinal` (bool) — afeta CFOP e `indFinal`
- `suframa` (se aplicável a Zona Franca)

### 0.4 Tabelas de tributação (dados versionados — mudam por lei)

Modelar como tabelas consultáveis, não `if` no código:

- **`RegraIcms`** — chave: `(ufOrigem, ufDestino, regime, ncmOuCest, origem, consumidorFinal, contribuinte)` →
  `cst/csosn, modBC, aliquota, reducaoBase, mva/ST, aliquotaFcp, aliquotaInterestadual (p/ DIFAL)`
- **`RegraPisCofins`** — `(regime, cst)` → `aliquotaPis, aliquotaCofins`
- **`RegraIpi`** — `(ncm)` → `cst, aliquota` (quando aplicável)
- Cada regra com `vigenciaInicio/Fim`.

Importadores: NCM (Receita), municípios IBGE, tabela de alíquotas interestaduais de ICMS.

---

## Fase 1 — Motor de regras fiscais (ERP, novo módulo `fiscal-rules`)

### 1.1 Operações pré-definidas (templates)

O operador **escolhe a operação**; o motor deriva o resto.

| Operação | natureza | finNFe | tpNF | indFinal | Regras |
|---|---|---|---|---|---|
| Venda de mercadoria | "Venda de mercadoria" | 1 (normal) | 1 (saída) | conforme cliente | CFOP resolver, ICMS normal |
| Venda interestadual consumidor final | idem | 1 | 1 | 1 | CFOP 6xxx, **DIFAL** |
| Devolução de venda | "Devolução de venda" | 4 (devolução) | 1 | — | CFOP 5202/6202, replica impostos da nota origem |
| Remessa p/ conserto | "Remessa para conserto" | 1 | 1 | — | CFOP 5915/6915, sem ICMS (suspensão) |
| Bonificação / brinde | "Bonificação" | 1 | 1 | — | CFOP 5910/6910 |

Começar com **Venda no estado**, **Venda interestadual** e **Devolução** — o resto entra depois.

### 1.2 CFOP resolver

```
resolveCfop(input): string
  input = {
    operacao,                 // template acima
    ufOrigem, ufDestino,      // do FiscalProfile e do Customer
    destinatarioContribuinte, // Customer.indicadorIe
    consumidorFinal,
    temSt,                    // da RegraIcms
    ncm
  }
```
Regra base: 1º dígito = `5` (mesma UF) | `6` (UF diferente) | `7` (exterior).
2º-4º dígitos vêm de uma tabela de-para por operação. Guardar a tabela de-para editável (o contador
pode ajustar sem deploy).

### 1.3 Tax calculator

```
calcularImpostos(item, contexto): { icms, icmsSt, fcp, ipi, pis, cofins, totais }
```
- Busca `RegraIcms` pela chave do contexto → aplica base/alíquota/redução; se `temSt`, calcula
  ICMS-ST com MVA; se interestadual + consumidor final, calcula DIFAL.
- `RegraPisCofins` e `RegraIpi` idem.
- Devolve os valores por item + agrega os totais da nota (`vBC, vICMS, vICMSST, vFCP, vIPI, vPIS,
  vCOFINS, vProd, vFrete, vDesc, vNF`).

### 1.4 Montagem do payload

`fiscal.service.ts::emitirNota` passa a:
1. Resolver `FiscalProfile` da loja (emitente).
2. Para cada item: `resolveCfop` + `calcularImpostos`.
3. Montar o `EmitNfeRequest` com os valores calculados (não mais `aliquota: 18.0` chumbado).
4. Enviar `municipioIbge` real do cliente, `indicadorIe`, etc.

---

## Fase 2 — Validação antes de enviar (ERP)

### 2.1 Pré-flight forte

Substituir o check atual (`!item.product.ncm || !item.product.cfop || !item.product.cst`) por
uma validação que use os dados mestres:

- Emitente: `FiscalProfile` completo (CNPJ, IE, `municipioIbge` casa com `uf`, série definida).
- Cliente: documento válido, `municipioIbge` (7 díg) casa com `uf`, `indicadorIe` coerente com ter/não ter IE.
- Item: `ncm` (8 díg, existe), `origin` preenchido, unidade tributável, GTIN ou "SEM GTIN".
- Totais fecham (`Σ itens + frete − desconto = vNF`).
- Operação escolhida compatível com o status do pedido.

Erros → bloqueia com lista clara (código + campo + mensagem). Nada de emissão "às cegas".

### 2.2 Endpoint de validação no backend do ERP

```
POST /fiscal/validate/:orderId   (Permissions: fiscal.emit)
```
1. Monta o `EmitNfeRequest` exatamente como o `emit` faria (Fase 1.4).
2. Chama `POST {FISCAL_MICROSERVICE_URL}/nfe/validate` com a `X-API-Key` do tenant.
3. Junta os erros do **pré-flight local** (2.1) com os `erros` do NexosFiscal e devolve
   `{ valido, erros: [{ campo, mensagem, severidade, origem: 'erp' | 'fiscal' }] }`.

### 2.3 Tela "Revisar NF-e antes de emitir" (frontend)

Ao clicar em **Emitir Nota** no painel do pedido, em vez do diálogo simples de hoje, abrir um
**modal de revisão**:

- **Seletor de operação** (templates da Fase 1.1) — muda CFOP/natureza/impostos ao vivo.
- **Emitente / Destinatário** — read-only, com aviso se algum campo fiscal estiver faltando (link
  para corrigir o cadastro).
- **Itens** — tabela com `cProd, xProd, NCM, CFOP (calculado), CST, vUnCom, qCom, vProd, ICMS, PIS, COFINS`.
  CFOP e CST **editáveis** (override manual → registra `alteradoPor` / `motivo`).
- **Totais** — `vProd, vFrete, vDesc, vICMS, vICMSST, vFCP, vIPI, vPIS, vCOFINS, vNF`.
- Botão **"Validar"** → chama `POST /fiscal/validate/:orderId` → mostra a lista de erros/avisos
  inline nos campos. `error` bloqueia; `warning` mostra em amarelo mas permite prosseguir.
- Botão **"Emitir"** só habilita quando não há `error`.
- Após emitir: manter o comportamento reativo já feito (`ERP-3` — polling do status) e os
  downloads autenticados (`ERP-2`).

### 2.4 Correção e reemissão

Se a SEFAZ rejeitar (webhook `NFeRejected`), a tela de revisão abre já preenchida com o motivo
traduzido; o operador corrige (item, CFOP, cadastro) e reemite sem recomeçar. O `externalId`
continua sendo `orderId` (idempotência), então a reemissão substitui o documento anterior no
NexosFiscal quando ele ainda não foi autorizado.

---

## Fase 3+ — depende do NexosFiscal (não é ERP)

Registrado em `NexosFiscal/docs/KNOWN_ISSUES.md`:
- `P0-1` — `ZeusNfeTransmitter` real (mapeamento, assinatura, `NFeAutorizacao`, DANFE oficial) + A1 + homologação SEFAZ.
- XSD ligado (schemas no volume).
- Eventos reais (cancelamento/CC-e/inutilização), contingência SVC, consulta de status.
- Storage S3 + backup.

Enquanto o `Fiscal__Transmitter` estiver em `mock`, dá para desenvolver e validar TODA a Fase 0–2
(o `validate` e o `emit` funcionam; só a "autorização" é simulada).

---

## Ordem sugerida de execução no ERP

1. ✅ **Fase 0.1 + 0.3** — `FiscalProfile` e campos fiscais do `Customer` (migrations + telas). Sem isso, nada fecha.
2. ✅ **Fase 0.2** — campos fiscais do `Product`. *(Importador de tabela NCM oficial ainda não feito — validação continua só de formato, 8 dígitos.)*
3. ✅ **Fase 2.1 + 2.2** — pré-flight forte + `POST /fiscal/validate/:orderId` (já chama o `/nfe/validate` do NexosFiscal e combina os erros).
4. ✅ **Fase 1** — motor de CFOP + tax calculator, cobrindo Venda (mesma UF/interestadual, com/sem contribuinte) e Devolução.
5. ✅ **Fase 0.4** — tabelas `RegraIcms`/`RegraPisCofins`/`RegraIpi` com seed genérico (Normal × Simples, mesma-UF × interestadual) — **placeholder**, precisa de revisão contábil antes de operar com alíquotas reais.
6. ✅ **Fase 2.3** — tela de revisão fiscal, preenchimento rápido de item incompleto e acesso rápido à Configuração Fiscal.
7. ⏳ **Fase 2.4** — fluxo de rejeição/reemissão. Ainda não implementada; ver nota abaixo — o
   NexosFiscal deduplica por `externalId` independente do status, então corrigir e reemitir uma
   nota rejeitada pode exigir decisão de contrato (reprocessar o mesmo `externalId` quando o
   status é terminal-de-falha, endpoint dedicado de retry, ou o ERP gerar um novo `externalId` por
   tentativa).

## Contrato com o NexosFiscal (resumo para não divergir)

- Base URL: `FISCAL_MICROSERVICE_URL` · auth: `X-API-Key` do tenant.
- `POST /nfe/validate` — body = `EmitNfeRequest`; resp `200 { valido, erros:[{campo, mensagem, severidade}] }`.
- `POST /nfe/emit` — mesmo body; roda o pré-flight; `400 { message, erros[] }` se houver `error`,
  senão `202 { message, documentId }` (documento novo, na fila) e resultado via webhook. Se já
  existe um documento para aquele `externalId` (qualquer status), responde `200
  { message: "Document already exists.", documentId, status }` **sem** disparar novo webhook — o
  ERP precisa ler esse `status` da resposta e sincronizar direto (feito em
  `fiscal.service.ts::emitirNota`), senão a nota fica presa em `PROCESSING` mesmo já aprovada.
- Campos do `EmitNfeRequest`: ver `NexosFiscal/docs/API_REFERENCE.md`. Documento e CEP **só dígitos**
  (já corrigido no `fiscal.service.ts` — `ERP-1`).
- Numeração: **não** alocar no ERP; o NexosFiscal atribui na autorização.
