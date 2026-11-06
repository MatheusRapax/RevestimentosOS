import { normalizarErrosRemotos } from './nexos-status';
import { FiscalService } from './fiscal.service';
import { of, throwError } from 'rxjs';

describe('normalizarErrosRemotos (400 do serviço fiscal em dois formatos)', () => {
  it('formato documentado { message, erros[] }', () => {
    expect(
      normalizarErrosRemotos({
        message: 'Pré-flight falhou',
        erros: [
          {
            campo: 'itens[0].cfop',
            mensagem: 'CFOP errado',
            severidade: 'error',
          },
        ],
      }),
    ).toEqual([
      { campo: 'itens[0].cfop', mensagem: 'CFOP errado', severidade: 'error' },
    ]);
  });

  it('formato ASP.NET ProblemDetails { errors: { "Itens[0].Cest": [...] } }', () => {
    expect(
      normalizarErrosRemotos({
        title: 'One or more validation errors occurred.',
        errors: {
          'Itens[0].Cest': ['CEST com 7 dígitos.'],
          'Destinatario.Endereco.Cep': ['CEP inválido.', 'CEP obrigatório.'],
        },
      }),
    ).toEqual([
      { campo: 'itens[0].cest', mensagem: 'CEST com 7 dígitos.' },
      { campo: 'destinatario.endereco.cep', mensagem: 'CEP inválido.' },
      { campo: 'destinatario.endereco.cep', mensagem: 'CEP obrigatório.' },
    ]);
  });

  it('corpo vazio, texto ou sem erros devolve lista vazia', () => {
    expect(normalizarErrosRemotos(undefined)).toEqual([]);
    expect(normalizarErrosRemotos('erro')).toEqual([]);
    expect(normalizarErrosRemotos({ message: 'x' })).toEqual([]);
    expect(normalizarErrosRemotos({ errors: { A: [''] } })).toEqual([]);
  });
});

describe('FiscalService.emitirNota — 400 em ProblemDetails chega ao operador', () => {
  it('guarda e devolve cada campo/mensagem em vez de "Request failed with status code 400"', async () => {
    const prisma: any = {
      fiscalDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    const http: any = {
      post: jest.fn().mockReturnValue(
        throwError(() => ({
          message: 'Request failed with status code 400',
          response: {
            status: 400,
            data: {
              title: 'One or more validation errors occurred.',
              errors: { 'Itens[0].Cest': ['CEST com 7 dígitos.'] },
            },
          },
        })),
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
      config: {},
      apiKey: 'k',
      apiUrl: 'http://fiscal.teste/api/v1',
    });
    service.buildEmitPayload = jest.fn().mockResolvedValue({ itens: [] });
    service.runLocalPreflight = jest.fn().mockReturnValue([]);
    service.missingItemFiscalProducts = jest.fn().mockReturnValue([]);

    const falha: any = await service
      .emitirNota('o1', 'c1')
      .catch((e: any) => e);

    const corpo = falha.getResponse();
    expect(corpo.code).toBe('FISCAL_REJECTED');
    expect(corpo.message).toBe('O serviço fiscal recusou os dados da nota.');
    expect(corpo.erros).toEqual([
      {
        campo: 'itens[0].cest',
        mensagem: 'CEST com 7 dígitos.',
        origem: 'fiscal',
      },
    ]);
    expect(
      prisma.fiscalDocument.create.mock.calls[0][0].data.errorMessage,
    ).toBe(
      'O serviço fiscal recusou os dados da nota. — itens[0].cest: CEST com 7 dígitos.',
    );
  });
});

describe('FiscalService.validateOrder — erro do serviço diz de qual produto é', () => {
  it('prefixa o nome do produto nos erros itens[N] e mantém os demais', async () => {
    const http: any = {
      post: jest.fn().mockReturnValue(
        of({
          data: {
            valido: false,
            erros: [
              {
                campo: 'itens[1].cest',
                mensagem: 'CEST com 7 dígitos.',
                severidade: 'error',
              },
              {
                campo: 'pagamento',
                mensagem: 'Soma menor.',
                severidade: 'warning',
              },
            ],
          },
        }),
      ),
    };
    const service: any = new FiscalService(
      {} as any,
      http,
      { get: () => undefined } as any,
      {} as any,
      {} as any,
    );
    service.buildEmitContext = jest.fn().mockResolvedValue({
      order: {},
      profile: {},
      config: {},
      apiKey: 'k',
      apiUrl: 'http://fiscal.teste/api/v1',
    });
    service.buildEmitPayload = jest.fn().mockResolvedValue({
      itens: [
        { descricao: 'Porcelanato 60x60' },
        { descricao: 'Argamassa AC-III' },
      ],
    });
    service.runLocalPreflight = jest.fn().mockReturnValue([]);

    const r = await service.validateOrder('o1', 'c1');

    expect(r.valido).toBe(false);
    expect(r.erros.map((e: any) => e.mensagem)).toEqual([
      'Argamassa AC-III: CEST com 7 dígitos.',
      'Soma menor.',
    ]);
  });
});
