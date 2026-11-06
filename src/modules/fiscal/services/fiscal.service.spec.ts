import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FiscalService } from './fiscal.service';

const CLINIC = 'clinic-1';
const TENANT = 'b0f83fb5-f870-4df5-95f6-95ad939cca08';

const perfil = (over: any = {}) => ({
  clinicId: CLINIC,
  cnpj: '42580788000100',
  ie: '123456789',
  im: null,
  crt: 1,
  logradouro: 'RUA TESTE',
  numero: '08',
  complemento: 'QUADRA25',
  bairro: 'COHAMA',
  municipioIbge: '2111300',
  municipioNome: 'SAO LUIS',
  uf: 'MA',
  cep: '65073830',
  ...over,
});

function build(opts: { profile?: any; config?: any } = {}) {
  const prisma: any = {
    clinicFiscalConfig: {
      findUnique: jest.fn().mockResolvedValue(opts.config ?? null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    fiscalProfile: {
      findUnique: jest.fn().mockResolvedValue(opts.profile ?? null),
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
    },
  };
  const http: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  const env: Record<string, string> = {
    FISCAL_MASTER_API_KEY: 'master-teste',
    FISCAL_MICROSERVICE_URL: 'http://fiscal.teste/api/v1',
  };
  const config: any = { get: (k: string) => env[k] };
  const service = new FiscalService(prisma, http, config, {} as any, {} as any);
  return { service, prisma, http };
}

describe('FiscalService — setup do tenant (perfil é a fonte da verdade)', () => {
  it('envia o endereço e os dados do perfil no POST /tenants', async () => {
    const { service, http, prisma } = build({ profile: perfil() });
    http.post
      .mockReturnValueOnce(of({ data: { id: TENANT } })) // /tenants
      .mockReturnValueOnce(of({ data: { apiKey: 'k-tenant' } })) // /api-keys
      .mockReturnValueOnce(of({ data: {} })); // /certificate

    await service.setupNexosFiscal(CLINIC, 'LOJA LTDA', '', Buffer.from('x'), 'senha', 'a.pfx', {});

    const [url, body, opts] = http.post.mock.calls[0];
    expect(url).toBe('http://fiscal.teste/api/v1/tenants');
    expect(opts.headers['X-API-Key']).toBe('master-teste');
    expect(body).toEqual({
      name: 'LOJA LTDA',
      cnpj: '42580788000100',
      ie: '123456789',
      im: undefined,
      crt: 1,
      uf: 'MA',
      cityCode: '2111300',
      address: {
        logradouro: 'RUA TESTE',
        numero: '08',
        complemento: 'QUADRA25',
        bairro: 'COHAMA',
        municipio: 'SAO LUIS',
        cep: '65073830',
      },
      environment: 'homologacao',
    });
    expect(prisma.clinicFiscalConfig.upsert).toHaveBeenCalled();
  });

  it('formulário divergente do perfil: erro, sem nenhuma chamada ao serviço fiscal', async () => {
    const { service, http } = build({ profile: perfil() });
    await expect(
      service.setupNexosFiscal(CLINIC, 'LOJA', '09608606000119', Buffer.from('x'), 's', 'a.pfx', {
        uf: 'SP',
      }),
    ).rejects.toThrow(/divergem do Perfil do Emitente.*fonte da verdade/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('sem perfil salvo: erro claro', async () => {
    const { service, http } = build({ profile: null });
    await expect(
      service.setupNexosFiscal(CLINIC, 'LOJA', '', Buffer.from('x'), 's', 'a.pfx'),
    ).rejects.toThrow(/Perfil do Emitente não configurado/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('CRT ausente no perfil: erro claro, sem chamada', async () => {
    const { service, http } = build({ profile: perfil({ crt: null }) });
    await expect(
      service.setupNexosFiscal(CLINIC, 'LOJA', '', Buffer.from('x'), 's', 'a.pfx'),
    ).rejects.toThrow(/Regime Tributário \(CRT\) não informado/);
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('FiscalService — sincronização do perfil com o tenant', () => {
  const config = { clinicId: CLINIC, nexosTenantId: TENANT, nexosApiKey: 'k' };

  it('faz GET e depois PUT sem environment e sem cnpj, com endereço', async () => {
    const { service, http } = build({ profile: perfil(), config });
    http.get.mockReturnValueOnce(of({ data: { cnpj: '42580788000100' } }));
    http.put.mockReturnValueOnce(
      of({ data: { cnpj: '42580788000100', crt: 1, uf: 'MA', cityCode: '2111300', environment: 'homologacao' } }),
    );

    const r = await service.syncTenantFromProfile(CLINIC);

    expect(http.get.mock.calls[0][0]).toBe(`http://fiscal.teste/api/v1/tenants/${TENANT}`);
    const [url, body, opts] = http.put.mock.calls[0];
    expect(url).toBe(`http://fiscal.teste/api/v1/tenants/${TENANT}`);
    expect(opts.headers['X-API-Key']).toBe('master-teste');
    expect(body).not.toHaveProperty('environment');
    expect(body).not.toHaveProperty('cnpj');
    expect(body).not.toHaveProperty('confirmarProducao');
    expect(body).toMatchObject({ crt: 1, uf: 'MA', cityCode: '2111300' });
    expect(body.address.cep).toBe('65073830');
    expect(r.synced).toBe(true);
  });

  it('CNPJ do perfil diferente do tenant: erro claro e NENHUM PUT/POST', async () => {
    const { service, http } = build({ profile: perfil(), config });
    http.get.mockReturnValueOnce(of({ data: { cnpj: '09608606000119' } }));

    await expect(service.syncTenantFromProfile(CLINIC)).rejects.toThrow(
      /CNPJ do perfil \(42\.580\.788\/0001-00\) não bate com o do tenant fiscal \(09\.608\.606\/0001-19\); é preciso recriar o tenant e subir o certificado de novo/,
    );
    expect(http.put).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('sem tenant cadastrado: pede o Setup primeiro', async () => {
    const { service, http } = build({ profile: perfil(), config: null });
    await expect(service.syncTenantFromProfile(CLINIC)).rejects.toThrow(/Setup Inicial/);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('perfil com CRT ausente: erro antes de qualquer chamada', async () => {
    const { service, http } = build({ profile: perfil({ crt: null }), config });
    await expect(service.syncTenantFromProfile(CLINIC)).rejects.toThrow(/CRT/);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('recusa do serviço fiscal vira mensagem em português', async () => {
    const { service, http } = build({ profile: perfil(), config });
    http.get.mockReturnValueOnce(of({ data: { cnpj: '42580788000100' } }));
    http.put.mockReturnValueOnce(
      throwError(() => ({ response: { data: { message: 'Código IBGE 3550308 não pertence à UF MA.' } } })),
    );
    await expect(service.syncTenantFromProfile(CLINIC)).rejects.toThrow(
      /recusou a atualização do emitente: Código IBGE 3550308/,
    );
  });
});

describe('FiscalService — salvar o perfil sincroniza (sem desfazer o salvamento)', () => {
  const config = { clinicId: CLINIC, nexosTenantId: TENANT, nexosApiKey: 'k' };

  it('com tenant: sincroniza e devolve sync.ok', async () => {
    const { service, http } = build({ profile: perfil(), config });
    http.get.mockReturnValueOnce(of({ data: { cnpj: '42580788000100' } }));
    http.put.mockReturnValueOnce(of({ data: {} }));
    const r: any = await service.upsertFiscalProfile(CLINIC, { cnpj: '42580788000100' } as any);
    expect(r.sync.ok).toBe(true);
    expect(http.put).toHaveBeenCalledTimes(1);
  });

  it('falha na sincronização não lança: perfil fica salvo e vem aviso', async () => {
    const { service, http, prisma } = build({ profile: perfil(), config });
    http.get.mockReturnValueOnce(of({ data: { cnpj: '09608606000119' } }));
    const r: any = await service.upsertFiscalProfile(CLINIC, { cnpj: '42580788000100' } as any);
    expect(prisma.fiscalProfile.upsert).toHaveBeenCalled();
    expect(r.sync.ok).toBe(false);
    expect(r.sync.message).toMatch(/não bate com o do tenant fiscal/);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('sem tenant: apenas salva (sync ignorado)', async () => {
    const { service, http } = build({ profile: perfil(), config: null });
    const r: any = await service.upsertFiscalProfile(CLINIC, { cnpj: '42580788000100' } as any);
    expect(r.sync).toEqual({ ok: false, skipped: true });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe('FiscalService — status do certificado/SEFAZ', () => {
  const config = { clinicId: CLINIC, nexosTenantId: TENANT, nexosApiKey: 'k-tenant' };

  it('alerta quando o CNPJ do certificado não confere e quando está vencido', async () => {
    const { service, http } = build({ config });
    http.get.mockReturnValueOnce(
      of({
        data: {
          ambiente: 'homologacao',
          uf: 'MA',
          reachable: true,
          cStat: 107,
          certificado: {
            cnpj: '09608606000119',
            notAfterUtc: '2020-01-01T00:00:00Z',
            expired: true,
            cnpjMatchesTenant: false,
          },
        },
      }),
    );
    const r: any = await service.getSefazStatus(CLINIC);
    expect(http.get.mock.calls[0][1].headers['X-API-Key']).toBe('k-tenant');
    expect(r.certificado.cnpjMatchesTenant).toBe(false);
    const msgs = r.alertas.map((a: any) => a.mensagem).join(' | ');
    expect(msgs).toMatch(/NÃO confere/);
    expect(msgs).toMatch(/VENCIDO/);
  });

  it('tudo certo: sem alertas', async () => {
    const { service, http } = build({ config });
    const futuro = new Date(Date.now() + 200 * 86400000).toISOString();
    http.get.mockReturnValueOnce(
      of({
        data: {
          ambiente: 'homologacao',
          reachable: true,
          certificado: { cnpj: '42580788000100', notAfterUtc: futuro, expired: false, cnpjMatchesTenant: true },
        },
      }),
    );
    const r: any = await service.getSefazStatus(CLINIC);
    expect(r.alertas).toEqual([]);
  });

  it('alerta forte se o tenant NÃO estiver em homologação', async () => {
    const { service, http } = build({ config });
    http.get.mockReturnValueOnce(
      of({ data: { ambiente: 'producao', reachable: true, certificado: { cnpjMatchesTenant: true, expired: false } } }),
    );
    const r: any = await service.getSefazStatus(CLINIC);
    expect(r.alertas.map((a: any) => a.mensagem).join(' ')).toMatch(/não é homologação/);
  });

  it('404 do serviço = sem certificado ativo', async () => {
    const { service, http } = build({ config });
    http.get.mockReturnValueOnce(throwError(() => ({ response: { status: 404 } })));
    const r: any = await service.getSefazStatus(CLINIC);
    expect(r.hasCertificate).toBe(false);
  });
});
