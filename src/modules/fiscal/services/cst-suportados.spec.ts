import { FiscalService } from './fiscal.service';
import { CfopResolverService } from '../../fiscal-rules/services/cfop-resolver.service';
import { TaxCalculatorService } from '../../fiscal-rules/services/tax-calculator.service';
import { cstNaoSuportados, tributosNaoTransmitidos } from './cst-suportados';

describe('cstNaoSuportados (A2)', () => {
  const ok = {
    icms: { cst: '102' },
    pis: { cst: '49' },
    cofins: { cst: '49' },
  };

  it('Simples (CRT 1/2): só CSOSN 102, 103, 300, 400, 500', () => {
    expect(cstNaoSuportados(1, ok)).toEqual([]);
    expect(cstNaoSuportados(2, { ...ok, icms: { cst: '500' } })).toEqual([]);
    const p = cstNaoSuportados(1, { ...ok, icms: { cst: '00' } });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/ICMS com CSOSN "00"/);
  });

  it('Regime Normal (CRT 3): só CST 00, 40, 41, 50, 60 (sem ST 10/30/70 nem redução 20)', () => {
    for (const cst of ['00', '40', '41', '50', '60']) {
      expect(cstNaoSuportados(3, { ...ok, icms: { cst } })).toEqual([]);
    }
    for (const cst of ['10', '20', '30', '70', '102']) {
      expect(cstNaoSuportados(3, { ...ok, icms: { cst } })[0]).toMatch(
        /ICMS com CST/,
      );
    }
  });

  it('PIS/COFINS: lista do serviço', () => {
    expect(
      cstNaoSuportados(3, {
        icms: { cst: '00' },
        pis: { cst: '03' },
        cofins: { cst: '01' },
      })[0],
    ).toMatch(/PIS com CST "03"/);
    expect(
      cstNaoSuportados(3, {
        icms: { cst: '00' },
        pis: { cst: '01' },
        cofins: { cst: '' },
      })[0],
    ).toMatch(/COFINS com CST "vazio"/);
  });

  it('sem CRT conhecido não valida o ICMS (o pré-flight pede o regime à parte)', () => {
    expect(cstNaoSuportados(undefined, { ...ok, icms: { cst: '70' } })).toEqual(
      [],
    );
  });
});

describe('tributosNaoTransmitidos', () => {
  it('nomeia só o que foi calculado', () => {
    expect(
      tributosNaoTransmitidos({
        icmsSt: { v: 1 },
        difal: { v: 2 },
        fcp: null,
        ipi: undefined,
      }),
    ).toEqual(['ICMS-ST', 'DIFAL']);
    expect(tributosNaoTransmitidos(undefined)).toEqual([]);
  });
});

describe('TaxCalculatorService — CST padrão sem regra cadastrada', () => {
  // nenhuma regra cadastrada em nenhuma tabela
  const vazia = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
  });
  const prisma: any = {
    regraIcms: vazia(),
    regraPisCofins: vazia(),
    regraIpi: vazia(),
  };
  const calc = new TaxCalculatorService(prisma);
  const ctx = (regime: number) => ({
    clinicId: 'c',
    ufOrigem: 'MA',
    ufDestino: 'MA',
    regime,
    consumidorFinal: true,
    contribuinte: false,
  });

  it('Simples usa 102 (um CST do Regime Normal seria recusado pelo serviço)', async () => {
    const r = await calc.calcular(ctx(1), {
      ncm: '69072100',
      origin: 0,
      baseCalculo: 100,
    });
    expect(r.icms.cst).toBe('102');
    expect(r.avisos.join(' ')).toMatch(/Nenhuma regra de ICMS/);
  });

  it('Regime Normal continua com 00', async () => {
    const r = await calc.calcular(ctx(3), {
      ncm: '69072100',
      origin: 0,
      baseCalculo: 100,
    });
    expect(r.icms.cst).toBe('00');
  });
});

describe('FiscalService.runLocalPreflight — impostos e regime (A2)', () => {
  const taxCom = (icmsCst: string, extras: any = {}) => ({
    icms: { cst: icmsCst, aliquota: 0, vBC: 100 },
    pis: { cst: '49', aliquota: 0, vBC: 100 },
    cofins: { cst: '49', aliquota: 0, vBC: 100 },
    icmsSt: null,
    fcp: null,
    difal: null,
    ipi: null,
    avisos: [],
    regrasAplicadas: [],
    ...extras,
  });
  const montar = (tax: any) =>
    new FiscalService(
      {} as any,
      {} as any,
      { get: () => undefined } as any,
      new CfopResolverService(),
      {
        calcular: jest.fn().mockResolvedValue(tax),
      } as any,
    ) as any;

  const perfil = (crt: number | null) => ({
    cnpj: '42580788000100',
    ie: '1',
    crt,
    uf: 'MA',
    municipioIbge: '2111300',
  });
  const pedido = {
    id: 'o',
    clinicId: 'c',
    status: 'PAGO',
    subtotalCents: 10000,
    totalCents: 10000,
    discountCents: 0,
    deliveryFee: 0,
    customer: {
      name: 'C',
      document: '12345678909',
      indicadorIe: 9,
      state: 'MA',
      city: 'SAO LUIS',
      municipioIbge: '2111300',
      consumidorFinal: true,
    },
    items: [
      {
        quantityBoxes: 1,
        totalCents: 10000,
        product: {
          id: 'p',
          name: 'Piso',
          ncm: '69072100',
          origin: 0,
          unit: 'UN',
        },
      },
    ],
    payments: [{ method: 'PIX', status: 'APPROVED', amountCents: 10000 }],
  };

  it('regra que gera CST de ST (10) no Regime Normal bloqueia com mensagem clara', async () => {
    const s = montar(taxCom('10'));
    const p = await s.buildEmitPayload(pedido, {}, perfil(3));
    const e = s
      .runLocalPreflight(pedido, p, perfil(3))
      .find((x: any) => x.campo === 'tributos.cst');
    expect(e.severidade).toBe('error');
    expect(e.mensagem).toMatch(
      /Piso: o serviço fiscal ainda não emite ICMS com CST "10"/,
    );
  });

  it('CST do Regime Normal para quem é Simples também bloqueia', async () => {
    const s = montar(taxCom('00'));
    const p = await s.buildEmitPayload(pedido, {}, perfil(1));
    expect(
      s
        .runLocalPreflight(pedido, p, perfil(1))
        .some((x: any) => x.campo === 'tributos.cst'),
    ).toBe(true);
  });

  it('CST suportado passa sem erro de tributo', async () => {
    const s = montar(taxCom('102'));
    const p = await s.buildEmitPayload(pedido, {}, perfil(1));
    expect(
      s
        .runLocalPreflight(pedido, p, perfil(1))
        .filter((x: any) => x.campo.startsWith('tributos')),
    ).toEqual([]);
  });

  it('DIFAL calculado vira aviso (a nota sairia sem ele), não bloqueio', async () => {
    const s = montar(taxCom('00', { difal: { vDifal: 5 } }));
    const p = await s.buildEmitPayload(pedido, {}, perfil(3));
    const e = s
      .runLocalPreflight(pedido, p, perfil(3))
      .find((x: any) => x.campo === 'tributos.nao-transmitido');
    expect(e.severidade).toBe('warning');
    expect(e.mensagem).toMatch(/DIFAL foi calculado/);
  });

  it('perfil sem CRT bloqueia (sem regime "3" silencioso)', async () => {
    const s = montar(taxCom('00'));
    const p = await s.buildEmitPayload(pedido, {}, perfil(null));
    const e = s
      .runLocalPreflight(pedido, p, perfil(null))
      .find((x: any) => x.campo === 'emitente.crt');
    expect(e.severidade).toBe('error');
  });
});
