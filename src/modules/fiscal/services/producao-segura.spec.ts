import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

describe('A20: trocar o ambiente muda o tenant no serviço', () => {
  const loja = (environment: string) => ({
    clinicId: CLINIC,
    nexosTenantId: TENANT,
    nexosApiKey: 'chave-guardada',
    environment,
  });
  const liberado = { FISCAL_ALLOW_PRODUCTION: 'true' };

  it('para produção: PUT /tenants/{id} com a chave mestra e confirmarProducao, e só então grava', async () => {
    const { service, http, prisma } = build({
      config: loja('2'),
      env: liberado,
      homologadas: 1,
    });
    http.put.mockReturnValue(of({ data: { environment: 'producao' } }));

    await service.updateSettings(CLINIC, { environment: '1' } as any);

    const [url, corpo, opcoes] = http.put.mock.calls[0];
    expect(url).toBe(`${API}/tenants/${TENANT}`);
    expect(corpo).toEqual({ environment: 'producao', confirmarProducao: true });
    expect(opcoes.headers['X-API-Key']).toBe('master-teste');
    expect(prisma.clinicFiscalConfig.upsert).toHaveBeenCalled();
    expect(http.put.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.clinicFiscalConfig.upsert.mock.invocationCallOrder[0],
    );
  });

  it('volta para homologação: PUT com environment homologacao', async () => {
    const { service, http } = build({ config: loja('1'), env: liberado });
    http.put.mockReturnValue(of({ data: {} }));
    await service.updateSettings(CLINIC, { environment: '2' } as any);
    expect(http.put.mock.calls[0][1]).toEqual({ environment: 'homologacao' });
  });

  it('serviço recusa a troca: erro e NADA é gravado no ERP', async () => {
    const { service, http, prisma } = build({
      config: loja('2'),
      env: liberado,
      homologadas: 1,
    });
    http.put.mockReturnValue(
      throwError(() => ({
        response: {
          status: 400,
          data: {
            message:
              'Mudar o ambiente para produção exige confirmarProducao=true.',
          },
        },
      })),
    );
    await expect(
      service.updateSettings(CLINIC, { environment: '1' } as any),
    ).rejects.toThrow(/recusou a troca de ambiente.*continua em homologação/);
    expect(prisma.clinicFiscalConfig.upsert).not.toHaveBeenCalled();
  });

  it('serviço fora do ar: erro "não respondeu" e nada é gravado', async () => {
    const { service, http, prisma } = build({
      config: loja('2'),
      env: liberado,
      homologadas: 1,
    });
    http.put.mockReturnValue(
      throwError(() => ({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      })),
    );
    await expect(
      service.updateSettings(CLINIC, { environment: '1' } as any),
    ).rejects.toThrow(/não respondeu à troca de ambiente/);
    expect(prisma.clinicFiscalConfig.upsert).not.toHaveBeenCalled();
  });

  it('a trava FISCAL_ALLOW_PRODUCTION continua valendo: sem ela, nem chama o serviço', async () => {
    const { service, http, prisma } = build({
      config: loja('2'),
      homologadas: 1,
    });
    await expect(
      service.updateSettings(CLINIC, { environment: '1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(http.put).not.toHaveBeenCalled();
    expect(prisma.clinicFiscalConfig.upsert).not.toHaveBeenCalled();
  });

  it('sem nota de homologação autorizada não passa para produção', async () => {
    const { service, http } = build({
      config: loja('2'),
      env: liberado,
      homologadas: 0,
    });
    await expect(
      service.updateSettings(CLINIC, { environment: '1' } as any),
    ).rejects.toThrow(/ao menos uma nota em homologação/);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('sem empresa no serviço não passa para produção', async () => {
    const { service, http } = build({
      config: { clinicId: CLINIC, environment: '2' },
      env: liberado,
    });
    await expect(
      service.updateSettings(CLINIC, { environment: '1' } as any),
    ).rejects.toThrow(/Envie o certificado e emita uma nota de homologação/);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('salvar sem mudar o ambiente não chama o serviço', async () => {
    const { service, http, prisma } = build({ config: loja('2') });
    await service.updateSettings(CLINIC, {
      environment: '2',
      defaultNaturezaOperacao: 'Venda',
    } as any);
    expect(http.put).not.toHaveBeenCalled();
    expect(prisma.clinicFiscalConfig.upsert).toHaveBeenCalled();
  });
});

describe('A20: o ambiente da nota vem do serviço', () => {
  it('lê environment de GET /nfe/{id} com a chave do tenant', async () => {
    const { service, http } = build();
    http.get.mockReturnValue(
      of({ data: { id: 'd1', environment: 'producao' } }),
    );
    const amb = await (service as any).ambienteDaNota(API, 'k-tenant', 'd1');
    expect(amb).toBe('producao');
    expect(http.get.mock.calls[0][0]).toBe(`${API}/nfe/d1`);
    expect(http.get.mock.calls[0][1].headers['X-API-Key']).toBe('k-tenant');
  });

  it('falha na consulta: null (webhook e reconciliação preenchem depois), sem lançar', async () => {
    const { service, http } = build();
    http.get.mockReturnValue(throwError(() => new Error('timeout')));
    await expect(
      (service as any).ambienteDaNota(API, 'k', 'd1'),
    ).resolves.toBeNull();
  });
});

describe('A20: emissão grava o ambiente que o serviço informou', () => {
  function emissao(config: any, ambienteNoServico: unknown) {
    const prisma: any = {
      fiscalDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    const http: any = {
      post: jest.fn().mockReturnValue(of({ data: { documentId: 'd1' } })),
      get: jest
        .fn()
        .mockReturnValue(
          ambienteNoServico instanceof Error
            ? throwError(() => ambienteNoServico)
            : of({ data: { id: 'd1', environment: ambienteNoServico } }),
        ),
    };
    const service: any = new FiscalService(
      prisma,
      http,
      { get: () => undefined } as any,
      {} as any,
      {} as any,
    );
    service.assertEmissionAllowed = jest.fn().mockResolvedValue(undefined);
    service.buildEmitContext = jest.fn().mockResolvedValue({
      order: { id: 'o1', items: [] },
      profile: {},
      config,
      apiKey: 'k',
      apiUrl: API,
    });
    service.buildEmitPayload = jest.fn().mockResolvedValue({ itens: [] });
    service.runLocalPreflight = jest.fn().mockReturnValue([]);
    service.missingItemFiscalProducts = jest.fn().mockReturnValue([]);
    return { service, prisma, http };
  }

  it('loja marcada como produção no ERP, tenant em homologação no serviço: grava homologacao', async () => {
    const { service, prisma, http } = emissao(
      { environment: '1' },
      'homologacao',
    );
    await service.emitirNota('o1', CLINIC);
    expect(http.get.mock.calls[0][0]).toBe(`${API}/nfe/d1`);
    expect(prisma.fiscalDocument.create.mock.calls[0][0].data.environment).toBe(
      'homologacao',
    );
  });

  it('sem resposta do serviço: não usa a configuração local', async () => {
    const { service, prisma } = emissao(
      { environment: '1' },
      new Error('timeout'),
    );
    await service.emitirNota('o1', CLINIC);
    expect(
      prisma.fiscalDocument.create.mock.calls[0][0].data,
    ).not.toHaveProperty('environment');
  });
});
