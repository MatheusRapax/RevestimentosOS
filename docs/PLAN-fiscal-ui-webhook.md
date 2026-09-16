# Plano — Integração fiscal no ERP: download autenticado + status reativo

Contexto: o microsserviço **NexosFiscal** passou por uma revisão de segurança.
Duas mudanças dele quebram o lado ERP e precisam de ajuste aqui no `RevestimentosOS`.
Verificado em teste ponta-a-ponta (emissão pela UI do pedido #0036 → webhook → `FiscalDocument` APPROVED).

Repositório do serviço fiscal: `../NexosFiscal` · issues correlatas: `NexosFiscal/docs/KNOWN_ISSUES.md`
(`ERP-1` já resolvido, `ERP-2` e `ERP-3` são este plano).

---

## ERP-2 — Links de XML/DANFE dão 401

### Sintoma
No painel de detalhes do pedido (aba **Nota Fiscal**), os links **XML** e **PDF** apontam para
`http://localhost:5000/storage/...` e retornam **401**.

### Causa
`clinicos-web/src/app/dashboard/pedidos/page.tsx` (~linhas 743 e 748) monta o href assim:

```tsx
<a href={doc.xmlUrl.replace('/app/storage', 'http://localhost:5000/storage')} ...>XML</a>
<a href={doc.danfeUrl.replace('/app/storage', 'http://localhost:5000/storage')} ...>PDF</a>
```

`doc.xmlUrl` / `doc.danfeUrl` guardam o **caminho interno do NexosFiscal**
(`/app/storage/{tenantId}/nfe/{chave}-procNFe.xml`), gravado por `FiscalService.handleWebhook`
a partir de `data.xmlPath` / `data.pdfPath`.

O NexosFiscal **removeu o `/storage` estático** (era um bypass de auth — qualquer um que adivinhasse
o caminho baixava XML fiscal de qualquer tenant). O acesso agora é só pelos endpoints autenticados:

- `GET {FISCAL_MICROSERVICE_URL}/nfe/{documentId}/xml`   → `application/xml`
- `GET {FISCAL_MICROSERVICE_URL}/nfe/{documentId}/danfe` → `application/pdf`

ambos exigem header `X-API-Key: {chave do tenant}`.
O `documentId` do NexosFiscal já está salvo em `FiscalDocument.uuid` (o webhook manda `data.documentId`
e o `handleWebhook` faz `uuid: data.documentId || data.DocumentId`).

### Solução: proxy autenticado no backend do ERP

**1. Novo método em `src/modules/fiscal/services/fiscal.service.ts`**

```ts
// helper: resolve URL base + X-API-Key do tenant (mesma lógica de emitirNota, extrair para um método privado)
private async resolveFiscalCreds(clinicId: string): Promise<{ apiUrl: string; apiKey: string }> {
  const config = await this.prisma.clinicFiscalConfig.findUnique({ where: { clinicId } });
  const apiKey = config?.nexosApiKey || this.configService.get<string>('FISCAL_API_KEY');
  const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
  if (!apiKey || !apiUrl) {
    throw new BadRequestException('Configuração fiscal (API Key / URL) ausente.');
  }
  return { apiUrl, apiKey };
}

async downloadFiscalFile(
  fiscalDocumentId: string,
  clinicId: string,
  kind: 'xml' | 'danfe',
): Promise<{ data: Buffer; contentType: string; filename: string }> {
  const doc = await this.prisma.fiscalDocument.findFirst({
    where: { id: fiscalDocumentId, clinicId }, // escopo por clínica — não confiar só no id
  });
  if (!doc) throw new NotFoundException('Documento fiscal não encontrado.');
  if (!doc.uuid) throw new BadRequestException('Documento fiscal ainda sem referência no serviço fiscal.');

  const { apiUrl, apiKey } = await this.resolveFiscalCreds(clinicId);
  const path = kind === 'xml' ? 'xml' : 'danfe';

  const resp = await firstValueFrom(
    this.httpService.get(`${apiUrl}/nfe/${doc.uuid}/${path}`, {
      headers: { 'X-API-Key': apiKey },
      responseType: 'arraybuffer',
    }),
  );

  const contentType = kind === 'xml' ? 'application/xml' : 'application/pdf';
  const ext = kind === 'xml' ? 'xml' : 'pdf';
  return {
    data: Buffer.from(resp.data),
    contentType,
    filename: `${doc.key || doc.uuid}-${kind === 'xml' ? 'procNFe' : 'danfe'}.${ext}`,
  };
}
```

Imports a garantir no arquivo: `NotFoundException` de `@nestjs/common`.

**2. Novas rotas em `src/modules/fiscal/controllers/fiscal.controller.ts`**

```ts
import { Res } from '@nestjs/common';
import { Response } from 'express';

@Get('documents/:id/xml')
@Permissions(PERMISSIONS.FISCAL_VIEW)
async downloadXml(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
  const file = await this.fiscalService.downloadFiscalFile(id, req.clinicId, 'xml');
  res.set({
    'Content-Type': file.contentType,
    'Content-Disposition': `inline; filename="${file.filename}"`,
  });
  res.send(file.data);
}

@Get('documents/:id/danfe')
@Permissions(PERMISSIONS.FISCAL_VIEW)
async downloadDanfe(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
  const file = await this.fiscalService.downloadFiscalFile(id, req.clinicId, 'danfe');
  res.set({
    'Content-Type': file.contentType,
    'Content-Disposition': `inline; filename="${file.filename}"`,
  });
  res.send(file.data);
}
```

Confirmar que `PERMISSIONS.FISCAL_VIEW` (`'fiscal.view'`) está no seed de permissões e no papel
Administrador (`prisma/seed.ts`); se não estiver, adicionar.

**3. Frontend — `clinicos-web/src/app/dashboard/pedidos/page.tsx` (~linhas 741-751)**

Trocar os dois `<a href=...replace('/app/storage', 'http://localhost:5000/storage')...>` por chamadas
autenticadas ao backend do ERP. Como `<a>` não manda o header Authorization, usar um handler que baixa
com o `api` (axios já autenticado) e abre um blob:

```tsx
const openFiscalFile = async (fiscalDocId: string, kind: 'xml' | 'danfe') => {
  try {
    const resp = await api.get(`/fiscal/documents/${fiscalDocId}/${kind}`, { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    toast.error(`Não foi possível baixar o ${kind.toUpperCase()}.`);
  }
};
```

```tsx
{doc.xmlUrl && (
  <button onClick={() => openFiscalFile(doc.id, 'xml')} className="text-blue-600 hover:text-blue-800 text-xs">XML</button>
)}
{doc.danfeUrl && (
  <button onClick={() => openFiscalFile(doc.id, 'danfe')} className="text-blue-600 hover:text-blue-800 text-xs">PDF</button>
)}
```

Manter a condição de exibir só quando `doc.xmlUrl` / `doc.danfeUrl` existem (indica que o serviço já
gravou os arquivos) — mas o link real agora usa `doc.id` (id local do `FiscalDocument`), não a URL.

### Aceite
- Emitir nota pela UI → após APPROVED, clicar **XML** abre o `<nfeProc>` real; **PDF** abre o DANFE.
- Documento de outra clínica não é acessível (o `findFirst` filtra por `clinicId`).

---

## ERP-3 — Status da nota não atualiza sozinho (só ao reabrir o modal)

### Sintoma
Depois de **Emitir Nota**, o painel mostra `PROCESSING` e **fica preso** nesse estado.
Só atualiza para `APPROVED` quando o operador fecha e reabre o modal do pedido.

### Causa
`handleEmitFiscal` (`pedidos/page.tsx` ~linha 169) chama `refetchDetails()` **uma vez**, logo após o
`POST /fiscal/emit` — quando o doc ainda está `PROCESSING`. O resultado real chega depois, via
**webhook** (`POST /fiscal/webhook`), que atualiza a linha `FiscalDocument` no banco. Não há nada
(polling / SSE / websocket) que avise o navegador. O ERP não tem infra de websocket.

### Solução: polling condicional no react-query (baixo custo, suficiente)

No `useQuery` de detalhes do pedido (`pedidos/page.tsx` ~linha 232, `queryKey: ['order', selectedOrder?.id]`),
adicionar `refetchInterval` que só liga enquanto houver documento fiscal em andamento:

```ts
const { data: orderDetails, isLoading: isLoadingDetails, refetch: refetchDetails } = useQuery({
  queryKey: ['order', selectedOrder?.id],
  queryFn: async () => {
    if (!selectedOrder?.id) return null;
    const response = await api.get(`/orders/${selectedOrder.id}`);
    return response.data;
  },
  enabled: !!selectedOrder?.id,
  refetchInterval: (query) => {
    const docs = query.state.data?.fiscalDocuments as Array<{ status: string }> | undefined;
    const pending = docs?.some((d) =>
      ['PROCESSING', 'PENDING', 'DRAFT'].includes((d.status || '').toUpperCase()),
    );
    return pending ? 3000 : false; // 3s enquanto processa; para quando resolver
  },
  refetchIntervalInBackground: false,
});
```

(Assinatura de `refetchInterval` como função existe no TanStack Query v5 — confirmar a versão em
`clinicos-web/package.json`; em v4 é `refetchInterval: (data) => ...`.)

Opcional (defensivo): limite de tempo — parar o polling após ~90s mesmo se continuar `PROCESSING`,
guardando um `emitStartedAt` em estado e comparando no callback; e um `toast` quando o status vira
`APPROVED`/`REJECTED` para feedback ativo.

O mesmo vale para o outro ponto de emissão (`emitFiscalMutation` ~linha 310 + botão "Emitir NF-e"
~linha 1155): como o polling está no próprio `useQuery` de detalhes, os dois caminhos ficam cobertos
sem mudança adicional.

### Aceite
- Emitir nota pela UI e **não** fechar o modal → em poucos segundos o badge vira `APPROVED` e os
  links XML/PDF aparecem sozinhos.
- Quando não há doc em andamento, não há requisições em loop (verificar na aba Network).

---

## ERP-4 (bônus, mesmo módulo) — `setupNexosFiscal` está desalinhado com a API atual

`src/modules/fiscal/services/fiscal.service.ts::setupNexosFiscal` **não** funciona contra o NexosFiscal atual:

1. **`POST /tenants`** recebe `{ name, document }`, mas a API espera
   `{ name, cnpj, ie?, uf, cityCode, crt, environment }`. `document` é ignorado; `uf`/`cityCode`/`crt`
   ficam nulos/zerados → o tenant sai inválido para emissão (a chave de acesso usa `uf`, `cnpj`, `cityCode`).
   **Ação:** montar o payload com os dados fiscais da clínica (`Clinic` / `StoreSettings` / `ClinicFiscalConfig`)
   — CNPJ só dígitos, UF, código IBGE do município (7 díg.), CRT (1/2/3), `environment` (`homologacao`/`producao`).
2. **`createKeyRes.data.key`** — a API retorna o campo **`apiKey`**, não `key`. Hoje `apiKey` fica
   `undefined` e o passo 3 (upload do certificado) vai com `X-API-Key: undefined` → 401.
   **Ação:** `const apiKey = createKeyRes.data.apiKey;`
3. `POST /tenants*` agora **exige a master key** (já é enviada — ok), e IE virou opcional (ok).

Sem `ERP-4`, o provisionamento de tenant pela tela de configuração fiscal não conclui. A emissão em si
funciona quando o tenant é criado manualmente com os campos certos (foi assim no teste E2E).

---

## Fora de escopo / apenas nota

- O diálogo de confirmação diz *"enviará os dados para o servidor da SEFAZ"*. Enquanto o NexosFiscal
  estiver com `Fiscal__Transmitter=mock` (default), não há SEFAZ. Cosmético; ajustar o texto quando
  `zeus` entrar.
- `GET /fiscal/settings` retorna **500** para super admin sem `clinicId`
  (`clinicFiscalConfig.findUnique({ where: { clinicId: undefined } })` em `fiscal.service.ts:372`).
  Independente da integração fiscal, mas está no mesmo arquivo — resolver com um guard de `clinicId`
  ou `findFirst`.
