import { FiscalService } from './fiscal.service';
import { CfopResolverService } from '../../fiscal-rules/services/cfop-resolver.service';
import {
  dadosIeDestinatario,
  gtinParaNota,
  informacoesComplementares,
  montarPagamento,
} from './nfe-payload';

describe('montarPagamento (A1: meio real)', () => {
  const pag = (method: string, amountCents: number, status = 'APPROVED') => ({
    method,
    status,
    amountCents,
  });

  it('usa os meios reais agrupados (PIX + dinheiro) e fecha com o total do pedido', () => {
    const r = montarPagamento([pag('PIX', 82600), pag('CASH', 82600)], 165200);
    expect(r.formas).toEqual([
      { meio: 'PIX', valor: 826 },
      { meio: 'DINHEIRO', valor: 826 },
    ]);
    expect(r.fecha).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  it('traduz cada método do ERP para o meio do serviço', () => {
    const r = montarPagamento(
      [
        pag('CREDIT_CARD', 100),
        pag('DEBIT_CARD', 100),
        pag('BOLETO', 100),
        pag('TRANSFER', 100),
      ],
      400,
    );
    expect(r.formas.map((f) => f.meio)).toEqual([
      'CARTAO_CREDITO',
      'CARTAO_DEBITO',
      'BOLETO',
      'TED',
    ]);
  });

  it('soma pagamentos do mesmo meio numa linha só', () => {
    const r = montarPagamento([pag('PIX', 1000), pag('PIX', 500)], 1500);
    expect(r.formas).toEqual([{ meio: 'PIX', valor: 15 }]);
  });

  it('ignora pagamento reembolsado, pendente ou cancelado', () => {
    const r = montarPagamento(
      [
        pag('PIX', 5700, 'REFUNDED'),
        pag('CASH', 5700, 'PENDING'),
        pag('PIX', 1000),
      ],
      1000,
    );
    expect(r.formas).toEqual([{ meio: 'PIX', valor: 10 }]);
    expect(r.fecha).toBe(true);
  });

  it('sem pagamento aprovado: SEM_PAGAMENTO com o valor total e aviso (nunca PIX inventado)', () => {
    const r = montarPagamento([], 7600);
    expect(r.formas).toEqual([{ meio: 'SEM_PAGAMENTO', valor: 76 }]);
    expect(r.fecha).toBe(false);
    expect(r.avisos[0]).toMatch(/sem pagamento/);
    expect(montarPagamento(undefined, 100).formas[0].meio).toBe(
      'SEM_PAGAMENTO',
    );
  });

  it('soma diferente do total: mantém os pagamentos e avisa', () => {
    const r = montarPagamento([pag('PIX', 5000)], 7600);
    expect(r.formas).toEqual([{ meio: 'PIX', valor: 50 }]);
    expect(r.fecha).toBe(false);
    expect(r.avisos[0]).toMatch(/somam R\$ 50\.00.*R\$ 76\.00/);
  });
});

describe('campos do cadastro (A1)', () => {
  it('GTIN só com 8, 12, 13 ou 14 dígitos', () => {
    expect(gtinParaNota('7891234567895')).toBe('7891234567895');
    expect(gtinParaNota('7891 2345')).toBe('78912345');
    expect(gtinParaNota('123')).toBeUndefined();
    expect(gtinParaNota(null)).toBeUndefined();
  });

  it('informações complementares: compacta espaços e limita a 2000', () => {
    expect(informacoesComplementares('  Entregar   na obra \n bloco B ')).toBe(
      'Entregar na obra bloco B',
    );
    expect(informacoesComplementares('')).toBeUndefined();
    expect(informacoesComplementares('x'.repeat(2500))).toHaveLength(2000);
  });

  it('IE do destinatário: indicador sempre que válido; IE só para contribuinte', () => {
    expect(
      dadosIeDestinatario({ indicadorIe: 1, stateRegistration: '123.456.789' }),
    ).toEqual({
      indicadorIe: 1,
      ie: '123456789',
    });
    expect(
      dadosIeDestinatario({ indicadorIe: 9, stateRegistration: '123456789' }),
    ).toEqual({ indicadorIe: 9 });
    expect(
      dadosIeDestinatario({ indicadorIe: 2, stateRegistration: 'ISENTO' }),
    ).toEqual({ indicadorIe: 2 });
    expect(
      dadosIeDestinatario({ indicadorIe: null, stateRegistration: null }),
    ).toEqual({});
    expect(dadosIeDestinatario({ indicadorIe: 7 as any })).toEqual({});
  });
});

// ── Payload completo ──
const tax = {
  icms: { cst: '102', aliquota: 0, vBC: 0 },
  pis: { cst: '49', aliquota: 0, vBC: 0 },
  cofins: { cst: '49', aliquota: 0, vBC: 0 },
  icmsSt: null,
  fcp: null,
  difal: null,
  ipi: null,
  avisos: [],
  regrasAplicadas: [],
};

function build() {
  const service = new FiscalService(
    {} as any,
    {} as any,
    { get: () => undefined } as any,
    new CfopResolverService(),
    { calcular: jest.fn().mockResolvedValue(tax) } as any,
  );
  return service as any;
}

const perfil = {
  cnpj: '42580788000100',
  ie: '123',
  crt: 1,
  uf: 'MA',
  municipioIbge: '2111300',
};

const pedido = (over: any = {}, customer: any = {}) => ({
  id: 'o1',
  clinicId: 'c1',
  status: 'PAGO',
  subtotalCents: 178000,
  discountCents: 17800,
  deliveryFee: 5000,
  totalCents: 165200,
  notes: ' Entregar   na obra ',
  customer: {
    name: 'CLIENTE LTDA',
    document: '11222333000181',
    indicadorIe: 1,
    stateRegistration: '111.222.333',
    consumidorFinal: false,
    state: 'MA',
    city: 'SAO LUIS',
    municipioIbge: '2111300',
    complement: 'Sala 2',
    ...customer,
  },
  items: [
    {
      quantityBoxes: 10,
      totalCents: 178000,
      product: {
        id: 'p1',
        name: 'Porcelanato',
        ncm: '69072100',
        origin: 2,
        unit: 'M2',
        boxCoverage: 1.5,
        gtin: '7891234567895',
      },
    },
  ],
  payments: [
    { method: 'PIX', status: 'APPROVED', amountCents: 82600 },
    { method: 'CASH', status: 'APPROVED', amountCents: 82600 },
  ],
  ...over,
});

describe('FiscalService.buildEmitPayload — campos novos (A1)', () => {
  it('envia indicadorIe/ie, origem, gtin, desconto, complementares, complemento e pagamento real', async () => {
    const service = build();
    const p = await service.buildEmitPayload(pedido(), {}, perfil);

    expect(p.destinatario).toMatchObject({ indicadorIe: 1, ie: '111222333' });
    expect(p.destinatario.endereco.complemento).toBe('Sala 2');
    const item = p.itens[0];
    expect(item.gtin).toBe('7891234567895');
    expect(item.impostos.icms.origem).toBe(2);
    expect(item.impostos.pis.origem).toBe(2);
    expect(item.impostos.cofins.origem).toBe(2);
    expect(p.desconto).toBe(178);
    expect(p.informacoesComplementares).toBe('Entregar na obra');
    expect(p.frete.valorFrete).toBe(50);
    expect(p.pagamento.formas).toEqual([
      { meio: 'PIX', valor: 826 },
      { meio: 'DINHEIRO', valor: 826 },
    ]);
  });

  it('total pago = total do pedido (o frete NÃO é somado de novo)', async () => {
    const service = build();
    const p = await service.buildEmitPayload(pedido(), {}, perfil);
    const pago = p.pagamento.formas.reduce(
      (s: number, f: any) => s + f.valor,
      0,
    );
    const itens = p.itens.reduce((s: number, i: any) => s + i.valorTotal, 0);
    expect(Number(pago.toFixed(2))).toBe(
      Number((itens + p.frete.valorFrete - p.desconto).toFixed(2)),
    );
  });

  it('sem desconto/observação não manda os campos; sem IE do contribuinte não inventa', async () => {
    const service = build();
    const p = await service.buildEmitPayload(
      pedido(
        { discountCents: 0, notes: null, totalCents: 183000 },
        { indicadorIe: 9, stateRegistration: null },
      ),
      {},
      perfil,
    );
    expect(p).not.toHaveProperty('desconto');
    expect(p).not.toHaveProperty('informacoesComplementares');
    expect(p.destinatario).toMatchObject({ indicadorIe: 9 });
    expect(p.destinatario).not.toHaveProperty('ie');
  });

  it('metadados locais não são transmitidos', async () => {
    const service = build();
    const p = await service.buildEmitPayload(pedido(), {}, perfil);
    const t = service.toTransmissionPayload(p);
    expect(t).not.toHaveProperty('_pagamento');
    expect(t).not.toHaveProperty('_operacao');
    expect(t).not.toHaveProperty('avisosFiscais');
    expect(t.itens[0]).not.toHaveProperty('_fiscalCalculado');
  });
});

describe('FiscalService.runLocalPreflight — A1', () => {
  it('não avisa mais que o desconto "não é enviado"; erra se o desconto passar dos itens', async () => {
    const service = build();
    const ok = pedido();
    const p = await service.buildEmitPayload(ok, {}, perfil);
    const erros = service.runLocalPreflight(ok, p, perfil);
    expect(
      erros.find((e: any) => e.campo === 'totais.desconto'),
    ).toBeUndefined();

    const absurdo = pedido({ discountCents: 999999 });
    const p2 = await service.buildEmitPayload(absurdo, {}, perfil);
    const e2 = service
      .runLocalPreflight(absurdo, p2, perfil)
      .find((e: any) => e.campo === 'totais.desconto');
    expect(e2.severidade).toBe('error');
  });

  it('pedido sem pagamento aprovado gera aviso (não bloqueia)', async () => {
    const service = build();
    const o = pedido({ payments: [] });
    const p = await service.buildEmitPayload(o, {}, perfil);
    expect(p.pagamento.formas).toEqual([
      { meio: 'SEM_PAGAMENTO', valor: 1652 },
    ]);
    const aviso = service
      .runLocalPreflight(o, p, perfil)
      .find((e: any) => e.campo === 'pagamento');
    expect(aviso.severidade).toBe('warning');
  });

  it('CPF como contribuinte é erro local', async () => {
    const service = build();
    const o = pedido({}, { document: '12345678909', indicadorIe: 1 });
    const p = await service.buildEmitPayload(o, {}, perfil);
    const e = service
      .runLocalPreflight(o, p, perfil)
      .find(
        (x: any) => x.campo === 'cliente.indicadorIe' && /CPF/.test(x.mensagem),
      );
    expect(e?.severidade).toBe('error');
  });
});
