import { FiscalService } from './fiscal.service';
import { CfopResolverService } from '../../fiscal-rules/services/cfop-resolver.service';

// Revisão fiscal "para leigos": a operação (dentro/fora do estado) sai do cadastro,
// não existe UF "padrão SP" e o produto só precisa de NCM + origem (CFOP/CST vêm do motor).

const perfil = (over: any = {}) => ({
  cnpj: '42580788000100',
  ie: '123456789',
  crt: 1,
  uf: 'MA',
  municipioIbge: '2111300',
  ...over,
});

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
  const taxCalculator: any = { calcular: jest.fn().mockResolvedValue(tax) };
  const service = new FiscalService(
    {} as any,
    {} as any,
    { get: () => undefined } as any,
    new CfopResolverService(),
    taxCalculator,
  );
  return { service: service as any, taxCalculator };
}

const produto = (over: any = {}) => ({
  id: 'p1',
  name: 'Porcelanato 60x60',
  ncm: '69072100',
  origin: 0,
  unit: 'M2',
  boxCoverage: 1.44,
  cfop: null,
  cst: null,
  ...over,
});

const pedido = (
  customer: any,
  items: any[] = [
    { product: produto(), quantityBoxes: 10, totalCents: 100000 },
  ],
) => ({
  id: 'o1',
  clinicId: 'c1',
  status: 'PAGO',
  subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
  totalCents: items.reduce((s, i) => s + i.totalCents, 0),
  discountCents: 0,
  deliveryFee: 0,
  customer: {
    name: 'CLIENTE',
    document: '12345678909',
    indicadorIe: 9,
    consumidorFinal: true,
    municipioIbge: '2111300',
    city: 'SAO LUIS',
    ...customer,
  },
  items,
});

describe('FiscalService — tipo de operação calculado do cadastro', () => {
  it('cliente do mesmo estado: venda dentro do estado (5102), sem transmitir o resumo', async () => {
    const { service } = build();
    const payload = await service.buildEmitPayload(
      pedido({ state: 'MA' }),
      {},
      perfil(),
    );
    expect(payload._operacao).toMatchObject({
      ufOrigem: 'MA',
      ufDestino: 'MA',
      interestadual: false,
    });
    expect(payload.itens[0].cfop).toBe('5102');
    expect(service.toTransmissionPayload(payload)).not.toHaveProperty(
      '_operacao',
    );
  });

  it('cliente de outro estado: venda interestadual (6108 para consumidor final não contribuinte)', async () => {
    const { service } = build();
    const payload = await service.buildEmitPayload(
      pedido({ state: 'sp' }),
      {},
      perfil(),
    );
    expect(payload._operacao).toMatchObject({
      ufOrigem: 'MA',
      ufDestino: 'SP',
      interestadual: true,
    });
    expect(payload.itens[0].cfop).toBe('6108');
  });

  it('sem UF do cliente não assume SP: payload com UF vazia, operação nula e pré-flight bloqueia', async () => {
    const { service } = build();
    const order = pedido({ state: '' });
    const payload = await service.buildEmitPayload(order, {}, perfil());
    expect(payload._operacao).toBeNull();
    expect(payload.destinatario.endereco.uf).toBe('');
    expect(payload.destinatario.endereco.codigoMunicipio).toBe('2111300');
    const erros = service.runLocalPreflight(order, payload, perfil());
    const e = erros.find((x: any) => x.campo === 'cliente.state');
    expect(e.severidade).toBe('error');
    expect(e.mensagem).toMatch(/dentro ou fora do estado/);
  });

  it('sem UF do emitente também não assume SP', async () => {
    const { service, taxCalculator } = build();
    const order = pedido({ state: 'MA' });
    const payload = await service.buildEmitPayload(
      order,
      {},
      perfil({ uf: null }),
    );
    expect(payload._operacao).toBeNull();
    expect(taxCalculator.calcular.mock.calls[0][0].ufOrigem).toBe('');
    const erros = service.runLocalPreflight(
      order,
      payload,
      perfil({ uf: null }),
    );
    expect(
      erros.some(
        (x: any) => x.campo === 'emitente.uf' && x.severidade === 'error',
      ),
    ).toBe(true);
  });
});

describe('FiscalService — validateOrder não repete em inglês o que já falta no cadastro', () => {
  it('com erro local, não chama o serviço fiscal', async () => {
    const { service } = build();
    const http = { post: jest.fn() };
    service.httpService = http;
    service.buildEmitContext = jest.fn().mockResolvedValue({
      order: pedido({ state: '', city: '' }),
      profile: perfil(),
      config: {},
      apiKey: 'k',
      apiUrl: 'http://fiscal.teste/api/v1',
    });
    const r = await service.validateOrder('o1', 'c1');
    expect(r.valido).toBe(false);
    expect(r.erros.map((e: any) => e.campo)).toEqual(
      expect.arrayContaining(['cliente.state', 'cliente.city']),
    );
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('FiscalService — dados fiscais exigidos do produto', () => {
  it('produto sem CFOP/CST mas com NCM e origem está completo', async () => {
    const { service } = build();
    const order = pedido({ state: 'MA' });
    expect(service.missingItemFiscalProducts(order)).toEqual([]);
    const payload = await service.buildEmitPayload(order, {}, perfil());
    const erros = service.runLocalPreflight(order, payload, perfil());
    expect(erros.filter((x: any) => x.campo.startsWith('item.'))).toEqual([]);
  });

  it('falta NCM ou origem: lista o produto e a mensagem usa o nome dele', async () => {
    const { service } = build();
    const semNcm = produto({ id: 'p2', name: 'Argamassa AC3', ncm: '' });
    const semOrigem = produto({ id: 'p3', name: 'Rejunte', origin: null });
    const order = pedido({ state: 'MA' }, [
      { product: produto(), quantityBoxes: 1, totalCents: 1000 },
      { product: semNcm, quantityBoxes: 1, totalCents: 1000 },
      { product: semOrigem, quantityBoxes: 1, totalCents: 1000 },
    ]);
    expect(
      service.missingItemFiscalProducts(order).map((p: any) => p.id),
    ).toEqual(['p2', 'p3']);
    const payload = await service.buildEmitPayload(order, {}, perfil());
    const erros = service.runLocalPreflight(order, payload, perfil());
    const msgs = erros
      .filter((x: any) => x.campo.startsWith('item.'))
      .map((x: any) => x.mensagem);
    expect(msgs).toEqual([
      'Argamassa AC3: falta a classificação fiscal (NCM, 8 dígitos).',
      'Rejunte: falta informar a origem da mercadoria (nacional ou importada).',
    ]);
  });
});
