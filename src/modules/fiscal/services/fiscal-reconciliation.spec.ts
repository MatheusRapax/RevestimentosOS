import { of, throwError } from 'rxjs';
import { FiscalReconciliationService } from './fiscal-reconciliation.service';

const URL_BASE = 'http://fiscal.teste/api/v1';

function build(opts: { locais?: any[]; pendentes?: any[]; config?: any; paginas?: any[]; eventos?: any } = {}) {
  const locais = opts.locais ?? [];
  const prisma: any = {
    clinicFiscalConfig: {
      findUnique: jest.fn().mockResolvedValue(opts.config ?? { clinicId: 'c1', nexosApiKey: 'k', lastReconciledAt: null }),
      findMany: jest.fn().mockResolvedValue([{ clinicId: 'c1' }]),
      update: jest.fn().mockResolvedValue({}),
    },
    fiscalDocument: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const ids = (where.OR as any[]).flatMap((o) => [o.uuid, o.orderId]).filter(Boolean);
        return Promise.resolve(locais.find((l) => ids.includes(l.uuid) || ids.includes(l.orderId)) ?? null);
      }),
      findMany: jest.fn().mockResolvedValue(opts.pendentes ?? []),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const paginas = opts.paginas ?? [{ totalPages: 1, data: [] }];
  const http: any = {
    get: jest.fn().mockImplementation((url: string, cfg: any) => {
      if (url.endsWith('/events')) return of({ data: opts.eventos ?? [] });
      const pagina = cfg?.params?.page ?? 1;
      return of({ data: paginas[pagina - 1] ?? { totalPages: 1, data: [] } });
    }),
  };
  const config: any = { get: (k: string) => (k === 'FISCAL_MICROSERVICE_URL' ? URL_BASE : undefined) };
  return { service: new FiscalReconciliationService(prisma, http, config), prisma, http };
}

const remota = (over: any = {}) => ({
  id: 'u1',
  externalId: 'o1',
  status: 'AUTHORIZED',
  accessKey: 'K44',
  environment: 'homologacao',
  series: 1,
  number: 5,
  ...over,
});

describe('FiscalReconciliationService (A7)', () => {
  it('consulta GET /nfe?updatedSince= com a chave do tenant e corrige a nota que o webhook perdeu', async () => {
    const local = { id: 'd1', clinicId: 'c1', orderId: 'o1', uuid: 'u1', status: 'PROCESSING' };
    const { service, prisma, http } = build({ locais: [local], paginas: [{ totalPages: 1, data: [remota()] }] });

    const r = await service.reconciliarClinica('c1');

    const [url, cfg] = http.get.mock.calls[0];
    expect(url).toBe(`${URL_BASE}/nfe`);
    expect(cfg.headers['X-API-Key']).toBe('k');
    expect(new Date(cfg.params.updatedSince).getTime()).not.toBeNaN();
    expect(r).toEqual({ conferidas: 1, atualizadas: 1, cancelamentosPendentes: 0 });
    expect(prisma.fiscalDocument.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'd1' },
      data: { status: 'APPROVED', key: 'K44', environment: 'homologacao', serie: '1', number: '5' },
    });
  });

  it('só LÊ do serviço fiscal (nenhum POST/PUT) e avança o cursor', async () => {
    const { service, prisma, http } = build();
    await service.reconciliarClinica('c1');
    expect(Object.keys(http)).toEqual(['get']);
    const cursor = prisma.clinicFiscalConfig.update.mock.calls[0][0].data.lastReconciledAt;
    expect(cursor).toBeInstanceOf(Date);
  });

  it('usa o cursor anterior com sobreposição de 2 minutos', async () => {
    const ultimo = new Date('2026-11-06T12:00:00Z');
    const { service, http } = build({ config: { clinicId: 'c1', nexosApiKey: 'k', lastReconciledAt: ultimo } });
    await service.reconciliarClinica('c1');
    expect(http.get.mock.calls[0][1].params.updatedSince).toBe('2026-11-06T11:58:00.000Z');
  });

  it('nota que não nasceu de um pedido do ERP é ignorada', async () => {
    const { service, prisma } = build({ locais: [], paginas: [{ totalPages: 1, data: [remota({ externalId: 'teste-homolog-006', id: 'x' })] }] });
    const r = await service.reconciliarClinica('c1');
    expect(r.atualizadas).toBe(0);
    expect(prisma.fiscalDocument.update).not.toHaveBeenCalled();
  });

  it('percorre todas as páginas', async () => {
    const { service, http } = build({
      paginas: [
        { totalPages: 2, data: [remota({ id: 'a', externalId: 'a' })] },
        { totalPages: 2, data: [remota({ id: 'b', externalId: 'b' })] },
      ],
    });
    const r = await service.reconciliarClinica('c1');
    expect(r.conferidas).toBe(2);
    expect(http.get.mock.calls.filter(([u]: any) => u.endsWith('/nfe'))).toHaveLength(2);
  });

  it('cancelamento em andamento com evento recusado (webhook perdido): volta ao normal com o motivo', async () => {
    const pendente = { id: 'd2', clinicId: 'c1', uuid: 'u2', status: 'APPROVED', cancelEventId: 'e1', cancelRequestedAt: new Date() };
    const { service, prisma } = build({
      pendentes: [pendente],
      eventos: [{ id: 'e1', type: 'CANCELLATION', status: 'REJECTED', cStat: 501, motivo: 'Prazo excedido' }],
    });
    const r = await service.reconciliarClinica('c1');
    expect(r.cancelamentosPendentes).toBe(1);
    const dados = prisma.fiscalDocument.update.mock.calls[0][0].data;
    expect(dados).not.toHaveProperty('status');
    expect(dados.eventError).toMatch(/Prazo excedido \(cStat 501\)/);
  });

  it('loja sem chave do serviço fiscal não consulta nada', async () => {
    const { service, http } = build({ config: { clinicId: 'c1', nexosApiKey: null } });
    const r = await service.reconciliarClinica('c1');
    expect(r.conferidas).toBe(0);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('o job de fundo nunca lança: falha de uma loja não derruba as outras', async () => {
    const { service, http } = build();
    http.get.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    await expect(service.reconciliarTodas()).resolves.toBeUndefined();
  });
});
