import { of, throwError } from 'rxjs';
import {
  resolverSegredoWebhook,
  validarUrlWebhook,
  webhookDoErpAtivo,
} from './webhook-cadastro';
import { FiscalService } from './fiscal.service';

const SEGREDO = 'segredo-forte-de-teste-1234567890';
const URL_ERP = 'https://erp.exemplo.com.br/api/fiscal/webhook';

describe('webhook-cadastro: segredo', () => {
  it('segredo próprio vale em qualquer ambiente', () => {
    expect(
      resolverSegredoWebhook({
        FISCAL_WEBHOOK_SECRET: SEGREDO,
        NODE_ENV: 'production',
      }),
    ).toEqual({ segredo: SEGREDO, padrao: false });
  });

  it('produção sem segredo ou com o de exemplo: nenhum segredo', () => {
    expect(
      resolverSegredoWebhook({ NODE_ENV: 'production' }).segredo,
    ).toBeNull();
    expect(
      resolverSegredoWebhook({
        NODE_ENV: 'production',
        FISCAL_WEBHOOK_SECRET: 'uma-senha-secreta-para-hmac',
      }).segredo,
    ).toBeNull();
  });

  it('fora de produção cai no segredo fixo, marcado como padrão', () => {
    const r = resolverSegredoWebhook({ NODE_ENV: 'development' });
    expect(r.padrao).toBe(true);
    expect(r.segredo).toBe('uma-senha-secreta-para-hmac');
  });
});

describe('webhook-cadastro: URL pública', () => {
  it('sem FISCAL_WEBHOOK_URL é erro, com explicação', () => {
    expect(validarUrlWebhook(undefined, false).erro).toMatch(
      /FISCAL_WEBHOOK_URL não está configurada/,
    );
    expect(validarUrlWebhook('   ', true).erro).toBeDefined();
  });

  it('URL malformada ou de outro protocolo é erro', () => {
    expect(validarUrlWebhook('erp sem protocolo', false).erro).toMatch(
      /inválida/,
    );
    expect(validarUrlWebhook('ftp://erp/x', false).erro).toMatch(/https:\/\//);
  });

  it('localhost só fora de produção', () => {
    expect(
      validarUrlWebhook('http://localhost:3000/fiscal/webhook', false).url,
    ).toBe('http://localhost:3000/fiscal/webhook');
    expect(
      validarUrlWebhook('http://localhost:3000/fiscal/webhook', true).erro,
    ).toMatch(/endereço público/);
  });

  it('URL pública vale em produção', () => {
    expect(validarUrlWebhook(URL_ERP, true)).toEqual({ url: URL_ERP });
  });
});

describe('webhook-cadastro: o que está cadastrado no serviço', () => {
  it('só conta registro ativo, da mesma URL, recebendo todos os eventos', () => {
    expect(
      webhookDoErpAtivo(
        [{ url: URL_ERP, eventType: 0, isActive: true }],
        URL_ERP,
      ),
    ).toBe(true);
    expect(
      webhookDoErpAtivo(
        [{ url: URL_ERP, eventType: 1, isActive: true }],
        URL_ERP,
      ),
    ).toBe(false);
    expect(
      webhookDoErpAtivo(
        [{ url: URL_ERP, eventType: 0, isActive: false }],
        URL_ERP,
      ),
    ).toBe(false);
    expect(
      webhookDoErpAtivo([{ url: 'https://outro/x', eventType: 0 }], URL_ERP),
    ).toBe(false);
    expect(webhookDoErpAtivo({ erro: 'x' }, URL_ERP)).toBe(false);
  });
});

describe('FiscalService: cadastro do webhook (A17)', () => {
  const antes = { ...process.env };
  afterEach(() => {
    process.env = { ...antes };
  });

  function build(
    opts: {
      config?: any;
      env?: Record<string, string | undefined>;
      post?: any;
    } = {},
  ) {
    process.env.NODE_ENV = 'test';
    process.env.FISCAL_WEBHOOK_SECRET = SEGREDO;
    const env: Record<string, string | undefined> = {
      FISCAL_WEBHOOK_URL: URL_ERP,
      FISCAL_MICROSERVICE_URL: 'http://nexos:5000/api/v1',
      ...(opts.env ?? {}),
    };
    const prisma: any = {
      clinicFiscalConfig: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            opts.config === undefined
              ? { nexosTenantId: 't1', nexosApiKey: 'chave-do-tenant' }
              : opts.config,
          ),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const http: any = {
      post: jest.fn().mockReturnValue(opts.post ?? of({ data: { id: 'w1' } })),
      get: jest.fn(),
    };
    const config: any = { get: (k: string) => env[k] };
    const service = new FiscalService(
      prisma,
      http,
      config,
      {} as any,
      {} as any,
    );
    return { service, prisma, http };
  }

  it('cadastra com a chave do tenant, a URL configurada, o segredo e eventType 0', async () => {
    const { service, http, prisma } = build();
    const r = await service.registrarWebhook('c1');
    expect(r).toEqual({ ok: true, url: URL_ERP });
    const [url, corpo, opcoes] = http.post.mock.calls[0];
    expect(url).toBe('http://nexos:5000/api/v1/webhook');
    expect(corpo).toEqual({ url: URL_ERP, secret: SEGREDO, eventType: 0 });
    expect(opcoes.headers['X-API-Key']).toBe('chave-do-tenant');
    const gravado = prisma.clinicFiscalConfig.update.mock.calls[0][0].data;
    expect(gravado.webhookUrl).toBe(URL_ERP);
    expect(gravado.webhookRegisteredAt).toBeInstanceOf(Date);
    expect(gravado.webhookError).toBeNull();
  });

  it('falha do serviço vira mensagem para o operador, gravada, sem lançar', async () => {
    const { service, prisma } = build({
      post: throwError(() => ({
        response: { status: 401, data: 'Chave inválida.' },
      })),
    });
    const r = await service.registrarWebhook('c1');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/recusou o cadastro do webhook/);
    expect(
      prisma.clinicFiscalConfig.update.mock.calls[0][0].data.webhookError,
    ).toMatch(/recusou/);
  });

  it('serviço fora do ar: diz que não respondeu (não que recusou)', async () => {
    const { service } = build({
      post: throwError(() => ({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      })),
    });
    const r = await service.registrarWebhook('c1');
    expect(r.message).toMatch(/não respondeu ao cadastro do webhook/);
  });

  it('sem FISCAL_WEBHOOK_URL não chama o serviço e explica', async () => {
    const { service, http } = build({ env: { FISCAL_WEBHOOK_URL: undefined } });
    const r = await service.registrarWebhook('c1');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/FISCAL_WEBHOOK_URL/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('produção sem segredo próprio não cadastra (o ERP recusaria os eventos)', async () => {
    const { service, http } = build();
    process.env.NODE_ENV = 'production';
    delete process.env.FISCAL_WEBHOOK_SECRET;
    const r = await service.registrarWebhook('c1');
    expect(r.message).toMatch(/FISCAL_WEBHOOK_SECRET/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('loja sem tenant: nada a cadastrar', async () => {
    const { service, http } = build({ config: null });
    const r = await service.registrarWebhook('c1');
    expect(r).toMatchObject({ ok: false, skipped: true });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('consulta: diz se o webhook do ERP está ativo no serviço', async () => {
    const { service, http } = build({
      config: {
        nexosTenantId: 't1',
        nexosApiKey: 'k',
        webhookUrl: URL_ERP,
        webhookRegisteredAt: new Date(),
        webhookError: null,
      },
    });
    http.get.mockReturnValue(
      of({ data: [{ id: 'w1', url: URL_ERP, eventType: 0, isActive: true }] }),
    );
    const r: any = await service.consultarWebhook('c1');
    expect(r.ativo).toBe(true);
    expect(r.urlConfigurada).toBe(URL_ERP);
    expect(r.cadastrados).toHaveLength(1);
  });

  it('salvar a configuração repete o cadastro', async () => {
    const { service, prisma, http } = build();
    prisma.clinicFiscalConfig.upsert = jest.fn().mockResolvedValue({
      clinicId: 'c1',
      nexosTenantId: 't1',
      environment: '2',
    });
    const r: any = await service.updateSettings('c1', {
      environment: '2',
    } as any);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(r.webhook.ok).toBe(true);
  });
});
