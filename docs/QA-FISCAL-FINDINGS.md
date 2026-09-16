# QA — Módulo Fiscal (NF-e): dados fiscais, motor de CFOP/tributos, emissão e revisão

**Data:** 2026-09-11
**Escopo:** teste end-to-end de todo o módulo fiscal construído nas Fases 0.1 a 2.3 do
`docs/PLAN-fiscal-padrao.md` — perfil do emitente, dados fiscais de cliente e produto, motor de
CFOP/ICMS/PIS/COFINS/IPI, pré-flight local + validação remota (NexosFiscal), emissão real (com
webhook), tela de revisão fiscal, preenchimento rápido de produtos incompletos, reemissão de nota
já processada e a nova página de Configuração Fiscal da própria loja.
**Ambiente:** stack local Docker (`revestimentos-backend` :3000 / `revestimentos-frontend` :3001 /
`nexos-fiscal-api` :5000, mock de transmissão SEFAZ), clínica de seed
`f11eff62-86ec-43b4-9ee9-25b86d4391b3`, `admin@admin.com` (admin comum, não super admin).

> **Status:** os 4 bugs encontrados foram corrigidos e reverificados no mesmo dia — commit
> `8b54dc0` em `feat/fiscal-master-data`. Nenhum dado real foi perdido; todo estado alterado
> durante os testes (perfil, pedidos, clientes) foi restaurado ou é dado de QA inofensivo.

---

## Resumo por severidade

| ID | Severidade | Área | Resumo |
|----|-----------|------|--------|
| F-FISC-1 | 🔴 Alto | Config. Fiscal | `PUT /fiscal/settings`, `GET /fiscal/settings` e `POST /fiscal/setup` usavam `user.clinicId` (sempre `undefined`) em vez de `req.clinicId` — qualquer admin comum (não super admin) salvando a própria configuração recebia `500` do Prisma. Só não tinha aparecido porque, até hoje, esses endpoints só eram chamados pelo painel de super admin com `?clinicId=` explícito |
| F-FISC-2 | 🔴 Alto | Config. Fiscal | "Salvar Perfil" (Perfil do Emitente) estava **sempre quebrado** depois do primeiro salvamento — o formulário reenviava `id`/`clinicId`/`createdAt`/`updatedAt` (vindos do GET) e o DTO rejeitava com `400 property id should not exist` |
| F-FISC-3 | 🔴 Alto | Config. Fiscal | "Salvar Configurações" (Regras de Emissão) **não fazia nada** — sem toast, sem requisição — sempre que o certificado digital ainda não tinha sido configurado, porque os dois formulários da tela compartilhavam a mesma instância de `useForm()` |
| F-FISC-4 | 🟡 Baixo | Cliente | `Customer.municipioIbge` só validava tamanho máximo (`@MaxLength(7)`), aceitando valores como `"12345"` (5 dígitos) no cadastro — o pré-flight de emissão já barrava esses casos antes de emitir, mas o cadastro ficava com lixo |

Todos os 4 corrigidos — ver `src/modules/fiscal/controllers/fiscal.controller.ts`,
`clinicos-web/src/components/fiscal/fiscal-settings-form.tsx` e
`src/modules/customers/dto/create-customer.dto.ts` no commit `8b54dc0`.

---

## O que funciona (happy path e bordas confirmados)

### Perfil do emitente, cliente e produto (Fase 0.1–0.3)
- `PUT /fiscal/profile` rejeita CNPJ com menos de 14 dígitos, código IBGE com menos de 7 e UF fora
  de 2 letras — mensagens claras, `400`.
- Cadastro de cliente rejeita `indicadorIe` fora de `[1, 2, 9]`; aceita normalmente
  `municipioIbge`/`consumidorFinal`/`countryCode` válidos.
- `PATCH /stock/products/batch-fiscal` rejeita NCM fora de 8 dígitos, `origin` fora de 0–8 e
  `fatorConversao ≤ 0`; salva corretamente NCM/CFOP/CST/Origem/GTIN/unidade tributável/fator de
  conversão quando os dados são válidos.

### Motor de CFOP e tributos (Fase 1 / 0.4)
Testado via `POST /fiscal/validate/:orderId` em pedidos reais (não só chamada isolada do serviço):

| Cenário | CFOP | ICMS | PIS/COFINS | Observação |
|---|---|---|---|---|
| Venda mesma UF, Regime Normal | `5102` | CST 00, 18% | 1,65% / 7,6% | Regra `ICMS-NORMAL-MESMA-UF` |
| Venda mesma UF, Simples Nacional (CRT trocado temporariamente p/ teste) | `5102` | CSOSN 102, 0% | CST 08, 0% | Regra `ICMS-SIMPLES-MESMA-UF` — ICMS/PIS/COFINS embutidos no DAS |
| Venda interestadual (SP→RJ), consumidor final não contribuinte | `6108` | CST 00, 12% | 1,65% / 7,6% | DIFAL calculado: 18% interna − 12% interestadual × base = **R$ 4,56** (conferido manualmente) |

CFOP resolvido corretamente também para devolução (mesma UF `5202` / interestadual `6202`) e venda
interestadual **com** contribuinte (`6102`, sem o sufixo 108) — validado na função pura do
resolver.

### Pré-flight local + validação remota (Fase 2.1/2.2)
- Pedido com cliente e produto completos → `valido: true`, zero erros.
- Pedido com produto sem NCM/CFOP/CST/Origem → 4 erros `item.*` apontando exatamente o item e o
  campo faltante.
- **Pedido com dois itens, só um incompleto** → o pré-flight aponta erro só no item errado
  (`item[1]`), o item completo não gera nenhum erro. Confirma que a validação é por item, não por
  pedido inteiro.
- Cliente PJ com Inscrição Estadual preenchida mas `indicadorIe` diferente de 1 → aviso de
  coerência (`cliente.indicadorIe`) — pego num cliente de seed real, não um caso sintético.
- Pedido em `CRIADO`/`CANCELADO` → bloqueado tanto por `POST /fiscal/emit` quanto por
  `POST /fiscal/validate`; o `validate` mostra `pedido.status` **junto** com os outros erros (o
  `emit` prioriza o erro de produto ausente quando os dois coexistem — ver nota abaixo).
- A validação remota do NexosFiscal (`origem: "fiscal"`) é combinada corretamente com a local
  (`origem: "erp"`) na mesma lista — inclusive achando, em pedidos de teste antigos, uma
  divergência real de `valorTotal` (arredondamento) e um caso de soma de pagamentos maior que o
  total da nota. Não são bugs do motor novo — são inconsistências pré-existentes nos dados que a
  validação passou a expor, exatamente a função dela.

### Emissão completa e tela de revisão (Fase 2.3)
Testado no browser, de ponta a ponta:
- **Caminho limpo:** pedido sem nenhum erro → modal mostra "Tudo certo — pronto para emitir",
  botão "Confirmar e Emitir" habilitado → clique → `PROCESSING` → webhook do NexosFiscal → tela
  atualiza sozinha para `APPROVED` com chave de acesso real, em poucos segundos (polling já existe
  desde a Fase 2.1).
- **Produto sem dados fiscais:** modal mostra "Faltam dados fiscais nos produtos... você pode
  preenchê-los e emitir a seguir", botão "Preencher Dados e Emitir" → tentativa de emissão real
  retorna `MISSING_FISCAL_DATA` → abre o `FastInputModal` → preenche NCM/CFOP/CST/Origem → salva →
  **emite automaticamente** → `APPROVED`.
- **Cliente sem código IBGE + produto incompleto:** modal bloqueia emissão, mostra os dois erros e
  o atalho **"Editar Cliente"** (sem mostrar "Configuração Fiscal", que só aparece para erro de
  emitente) — confirma que os atalhos contextuais aparecem certos conforme o campo do erro.
- **Reemissão de nota já `APPROVED`:** o NexosFiscal deduplica por `externalId` e devolve
  `200 {status: "AUTHORIZED"}` sem novo webhook; o ERP sincroniza esse status direto (correção já
  aplicada nesta mesma sessão, antes do QA) em vez de travar a nota em `PROCESSING` para sempre.
- Download de XML e DANFE de nota aprovada segue funcionando (proxy autenticado, sem regressão).

### Configuração Fiscal da própria loja (nova página, Fase 2.3)
- Um admin comum (permissão `fiscal.config`, **sem** ser super admin) acessa
  `/dashboard/configuracoes/fiscal` e vê o perfil da própria clínica automaticamente — não existia
  essa opção antes (só dava pra editar pelo painel de super admin trocando de loja).
- Depois da correção dos 3 bugs acima: salvar o Perfil do Emitente e salvar as Regras de Emissão
  funcionam e persistem — reconferido com reload de página.

---

## Detalhamento dos achados

### F-FISC-1 — `user.clinicId` undefined em `/fiscal/settings` e `/fiscal/setup`
**Repro:** logar como `admin@admin.com` (não super admin), abrir
`/dashboard/configuracoes/fiscal`, editar "Natureza da Operação" e clicar em
"Salvar Configurações".
**Antes:** `500 Internal Server Error` — `Argument \`where\` of type ClinicFiscalConfigWhereUniqueInput needs at least one of \`id\` or \`clinicId\` arguments.` Motivo: `getSettings`/`updateSettings`/`setupNexosFiscal` no controller resolviam
`targetClinicId = user.isSuperAdmin && clinicId ? clinicId : user.clinicId` — mas o JWT não carrega
`clinicId` no `user` (quem popula isso é o `TenantGuard`, em `req.clinicId`, a partir do header
`X-Clinic-Id`). Mesma classe de bug já corrigida nesta sessão em `/fiscal/profile`.
**Por que só apareceu agora:** até a Fase 2.3 criar a página fiscal da própria loja, só o painel de
super admin (`/admin/fiscal`) chamava esses três endpoints — sempre com `?clinicId=` explícito na
URL, então `user.isSuperAdmin && clinicId` era sempre verdadeiro e o `user.clinicId` nunca era
avaliado de verdade.
**Correção:** trocado `user.clinicId` por `req.clinicId` (com `@Req() req: any` adicionado aos três
métodos), mantendo o fallback de super admin com `?clinicId=`.

### F-FISC-2 — "Salvar Perfil" sempre falhava depois do primeiro save
**Repro:** abrir a Configuração Fiscal (perfil já existente, que é o caso normal depois do setup
inicial), mudar qualquer campo do Perfil do Emitente, clicar "Salvar Perfil".
**Antes:** `400 property id should not exist` (e mais 3 mensagens iguais para `clinicId`,
`createdAt`, `updatedAt`).
**Causa:** `loadProfile()` espalhava a resposta inteira do `GET /fiscal/profile` — incluindo os 4
campos de metadado que o DTO não conhece — no estado editável do formulário; `saveProfile()`
reenviava tudo isso no `PUT`.
**Correção:** `loadProfile()` agora filtra só as chaves presentes em `EMPTY_PROFILE` (os campos
realmente editáveis) antes do merge.

### F-FISC-3 — "Salvar Configurações" (Regras de Emissão) não fazia nada sem certificado
**Repro:** com o Perfil do Emitente preenchido mas **sem** certificado digital configurado ainda,
mudar um campo em "Regras de Emissão" e clicar em "Salvar Configurações".
**Antes:** nenhuma reação visível — sem toast de sucesso ou erro, sem requisição de rede.
**Causa:** os cards "Setup Inicial" e "Regras de Emissão" são dois `<form>` diferentes, mas
compartilhavam uma única instância de `useForm()`. `handleSubmit` do react-hook-form valida
**todos** os campos registrados no hook, não só os do `<form>` que disparou o evento — como
`certificate`/`name`/`password` do Setup são `required` e ninguém tinha preenchido ainda, a
validação falhava e, sem um `onError` explícito, o `onSubmit` das Regras nunca era chamado.
**Correção:** duas instâncias de `useForm()` separadas (`registerSetup`/`handleSubmitSetup` e
`registerRules`/`handleSubmitRules`).

### F-FISC-4 — `Customer.municipioIbge` sem validação de formato
**Repro:** `POST /customers` com `municipioIbge: "12345"` (5 dígitos).
**Antes:** `201 Created` — o DTO só tinha `@MaxLength(7)`, que não barra strings mais curtas.
**Impacto:** o pré-flight de emissão (`runLocalPreflight`) já rejeita `municipioIbge` fora do
formato `/^\d{7}$/` antes de qualquer emissão real, então nenhuma nota saía errada por causa disso
— mas o cadastro do cliente ficava com um dado inválido salvo, sem aviso na hora do cadastro.
**Correção:** trocado para `@Matches(/^\d{7}$/)`, mesma regra já usada no DTO do
`FiscalProfile`.

---

## Observações sem ação necessária

- **Prioridade de erro em `POST /fiscal/emit` quando pedido está em status inválido *e* produto
  está incompleto:** o endpoint de emissão prioriza o erro `MISSING_FISCAL_DATA` (abre o
  preenchimento rápido) sobre o `PREFLIGHT_FAILED` (que incluiria `pedido.status`). Na prática isso
  não confunde ninguém porque o fluxo real de emissão (botão "Emitir Nota") sempre passa primeiro
  pela tela de revisão, que chama `validate` — e o `validate` mostra os dois erros juntos, sem
  priorizar um sobre o outro. Só afeta quem chamar `/fiscal/emit` diretamente, sem passar pela
  revisão.
- **NexosFiscal expôs duas inconsistências reais em pedidos de teste antigos** (divergência de
  `valorTotal` por arredondamento num item de venda por m², e soma de pagamentos maior que o total
  da nota): não são causadas pelo motor de CFOP/tributos novo — são dados de teste antigos que a
  nova validação passou a enxergar. Não exigem ação agora; se aparecerem em pedidos reais, valem
  investigação à parte (não é escopo fiscal).
- Um "mojibake" aparente (`São Paulo` exibido como `S�o Paulo`) apareceu durante os testes e foi
  investigado byte a byte — os bytes armazenados e devolvidos pela API são UTF-8 corretos
  (`0xC3 0xA3` = "ã"); o que aparecia errado era só a renderização do terminal/console usado para
  inspecionar, não os dados. Mantido como não-bug, consistente com achados anteriores da mesma
  natureza neste projeto.

## Fora de escopo (encaminhado)

Durante a investigação do F-FISC-1 (`user.clinicId` vs `req.clinicId`), o mesmo padrão suspeito
(`req.user.clinicId`) apareceu em controllers fora do módulo fiscal — `brands.controller.ts`,
`categories.controller.ts`, `product-import.controller.ts` e `tenant.service.ts`. Não foram
verificados nem corrigidos aqui (fora do escopo desta rodada de QA); uma tarefa separada foi aberta
para investigar se é o mesmo bug.
