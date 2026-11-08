import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FiscalService } from './fiscal.service';

const CLINIC = 'clinic-1';
const TENANT = 'b0f83fb5-f870-4df5-95f6-95ad939cca08';
const API = 'http://fiscal.teste/api/v1';

const perfil = {
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
};

function build(
  opts: {
    config?: any;
    env?: Record<string, string | undefined>;
    homologadas?: number;
  } = {},
) {
  const prisma: any = {
    clinicFiscalConfig: {
      findUnique: jest.fn().mockResolvedValue(opts.config ?? null),
      upsert: jest
        .fn()
        .mockImplementation(({ create }) => Promise.resolve(create)),
      update: jest.fn().mockResolvedValue({}),
    },
    fiscalProfile: { findUnique: jest.fn().mockResolvedValue(perfil) },
    fiscalDocument: {
      count: jest.fn().mockResolvedValue(opts.homologadas ?? 0),
    },
  };
  const http: any = { get: jest.fn(), post: jest.fn(), put: jest.fn() };
  const env: Record<string, string | undefined> = {
    FISCAL_MASTER_API_KEY: 'master-teste',
    FISCAL_MICROSERVICE_URL: API,
    ...(opts.env ?? {}),
  };
  const service = new FiscalService(
    prisma,
    http,
    { get: (k: string) => env[k] } as any,
    {} as any,
    {} as any,
  );
  // o cadastro do webhook (A17) tem testes próprios; aqui só conta se foi chamado
  const webhook = jest
    .spyOn(service, 'registrarWebhook')
    .mockResolvedValue({ ok: true, url: 'https://erp/fiscal/webhook' });
  return { service, prisma, http, webhook };
}

const setup = (service: FiscalService) =>
  service.setupNexosFiscal(
    CLINIC,
    'LOJA LTDA',
    '',
    Buffer.from('pfx'),
    'senha',
    'novo.pfx',
    {},
  );

const urls = (mock: jest.Mock) => mock.mock.calls.map((c) => c[0]);

describe('A19: reenviar o certificado não cria outra empresa no serviço', () => {
  const lojaComTenant = {
    clinicId: CLINIC,
    nexosTenantId: TENANT,
    nexosApiKey: 'chave-guardada',
    environment: '2',
    certificateUploadedAt: new Date('2025-11-01'),
  };

  it('com tenant e chave: sincroniza o perfil, envia o certificado com a chave guardada e recadastra o webhook, sem POST /tenants', async () => {
    const { service, http, prisma, webhook } = build({ config: lojaComTenant });
    http.get.mockReturnValue(of({ data: { cnpj: perfil.cnpj } }));
    http.put.mockReturnValue(of({ data: {} }));
    http.post.mockReturnValue(of({ data: {} }));

    const r = await setup(service);

    expect(r.success).toBe(true);
    expect(urls(http.post)).toEqual([`${API}/certificate`]);
    expect(http.post.mock.calls[0][2].headers['X-API-Key']).toBe(
      'chave-guardada',
    );
    expect(urls(http.put)).toEqual([`${API}/tenants/${TENANT}`]);
    expect(http.put.mock.calls[0][2].headers['X-API-Key']).toBe('master-teste');
    expect(http.put.mock.calls[0][1].environment).toBeUndefined();
    expect(webhook).toHaveBeenCalledWith(CLINIC);
    // tenant, chave e ambiente não mudam; só o certificado
    expect(prisma.clinicFiscalConfig.upsert).not.toHaveBeenCalled();
    const gravado = prisma.clinicFiscalConfig.update.mock.calls[0][0].data;
    expect(gravado).not.toHaveProperty('nexosTenantId');
    expect(gravado).not.toHaveProperty('nexosApiKey');
    expect(gravado).not.toHaveProperty('environment');
    expect(gravado.certificateFileName).toBe('novo.pfx');
    expect(gravado.certificateNotAfter).toBeNull();
  });

  it('chave guardada recusada (401): erro para o operador, sem recriar a empresa', async () => {
    const { service, http, prisma, webhook } = build({ config: lojaComTenant });
    http.get.mockReturnValue(of({ data: { cnpj: perfil.cnpj } }));
    http.put.mockReturnValue(of({ data: {} }));
    http.post.mockReturnValue(
      throwError(() => ({ response: { status: 401, data: 'Unauthorized' } })),
    );

    await expect(setup(service)).rejects.toThrow(
      /não aceita mais a chave guardada desta loja \(401\).*nenhuma empresa nova/,
    );
    expect(urls(http.post)).toEqual([`${API}/certificate`]);
    expect(prisma.clinicFiscalConfig.update).not.toHaveBeenCalled();
    expect(prisma.clinicFiscalConfig.upsert).not.toHaveBeenCalled();
    expect(webhook).not.toHaveBeenCalled();
  });

  it('senha errada no reenvio: mostra o motivo e mantém o tenant', async () => {
    const { service, http, prisma } = build({ config: lojaComTenant });
    http.get.mockReturnValue(of({ data: { cnpj: perfil.cnpj } }));
    http.put.mockReturnValue(of({ data: {} }));
    http.post.mockReturnValue(
      throwError(() => ({
        response: {
          status: 400,
          data: { message: 'Senha do certificado inválida.' },
        },
      })),
    );
    await expect(setup(service)).rejects.toThrow(
      'O serviço fiscal recusou o certificado: Senha do certificado inválida.',
    );
    expect(urls(http.post)).not.toContain(`${API}/tenants`);
    expect(prisma.clinicFiscalConfig.update).not.toHaveBeenCalled();
  });

  it('CNPJ do perfil diferente do tenant: erro, sem enviar certificado nem criar tenant', async () => {
    const { service, http } = build({ config: lojaComTenant });
    http.get.mockReturnValue(of({ data: { cnpj: '11222333000181' } }));
    await expect(setup(service)).rejects.toThrow(/não bate com o do tenant/);
    expect(http.post).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('primeira vez: cria o tenant em homologação e grava tenant e chave antes do certificado', async () => {
    const { service, http, prisma, webhook } = build({
      // loja que já salvou a configuração em produção localmente, sem empresa no serviço
      config: { clinicId: CLINIC, environment: '1' },
      env: { FISCAL_ALLOW_PRODUCTION: 'true' },
    });
    http.post
      .mockReturnValueOnce(of({ data: { id: TENANT } }))
      .mockReturnValueOnce(of({ data: { apiKey: 'k-nova' } }))
      .mockReturnValueOnce(of({ data: {} }));

    await setup(service);

    expect(urls(http.post)).toEqual([
      `${API}/tenants`,
      `${API}/tenants/${TENANT}/api-keys`,
      `${API}/certificate`,
    ]);
    expect(http.post.mock.calls[0][1].environment).toBe('homologacao');
    const upserts = prisma.clinicFiscalConfig.upsert.mock.calls.map(
      (c: any[]) => c[0].update,
    );
    expect(upserts[0]).toMatchObject({
      nexosTenantId: TENANT,
      environment: '2',
    });
    expect(upserts[1]).toMatchObject({
      nexosTenantId: TENANT,
      nexosApiKey: 'k-nova',
      environment: '2',
      certificateUploadedAt: null,
    });
    expect(
      prisma.clinicFiscalConfig.update.mock.calls[0][0].data
        .certificateUploadedAt,
    ).toBeInstanceOf(Date);
    expect(webhook).toHaveBeenCalled();
  });

  it('primeira vez com senha errada: o tenant fica guardado e o próximo envio não cria outro', async () => {
    const { service, http, prisma } = build({ config: null });
    http.post
      .mockReturnValueOnce(of({ data: { id: TENANT } }))
      .mockReturnValueOnce(of({ data: { apiKey: 'k-nova' } }))
      .mockReturnValueOnce(
        throwError(() => ({
          response: {
            status: 400,
            data: { message: 'Senha do certificado inválida.' },
          },
        })),
      );
    await expect(setup(service)).rejects.toBeInstanceOf(BadRequestException);
    const ultimo = prisma.clinicFiscalConfig.upsert.mock.calls.at(-1)[0].update;
    expect(ultimo).toMatchObject({
      nexosTenantId: TENANT,
      nexosApiKey: 'k-nova',
    });

    // segundo envio: a loja agora tem tenant e chave → caminho de reenvio
    prisma.clinicFiscalConfig.findUnique.mockResolvedValue({
      clinicId: CLINIC,
      nexosTenantId: TENANT,
      nexosApiKey: 'k-nova',
      environment: '2',
    });
    http.post.mockReset().mockReturnValue(of({ data: {} }));
    http.get.mockReturnValue(of({ data: { cnpj: perfil.cnpj } }));
    http.put.mockReturnValue(of({ data: {} }));
    await setup(service);
    expect(urls(http.post)).toEqual([`${API}/certificate`]);
  });

  it('tenant criado numa tentativa que não gerou a chave: gera a chave para o mesmo tenant, sem POST /tenants', async () => {
    const { service, http } = build({
      config: { clinicId: CLINIC, nexosTenantId: TENANT, nexosApiKey: null },
    });
    http.post
      .mockReturnValueOnce(of({ data: { apiKey: 'k-nova' } }))
      .mockReturnValueOnce(of({ data: {} }));
    await setup(service);
    expect(urls(http.post)).toEqual([
      `${API}/tenants/${TENANT}/api-keys`,
      `${API}/certificate`,
    ]);
  });

  it('sem certificado aceito a tela não mostra certificado (tenant e chave já gravados)', async () => {
    const { service } = build({
      config: {
        clinicId: CLINIC,
        nexosTenantId: TENANT,
        nexosApiKey: 'k',
        certificateUploadedAt: null,
        environment: '2',
      },
    });
    expect((await service.getSettings(CLINIC)).hasCertificate).toBe(false);
  });
});
