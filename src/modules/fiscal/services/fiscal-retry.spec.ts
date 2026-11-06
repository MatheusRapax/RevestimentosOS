import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FiscalService } from './fiscal.service';

function build(doc: any) {
  const prisma: any = {
    fiscalDocument: {
      findFirst: jest.fn().mockResolvedValue(doc),
      update: jest.fn().mockResolvedValue({}),
    },
    clinicFiscalConfig: {
      findUnique: jest.fn().mockResolvedValue({ nexosApiKey: 'k-tenant' }),
    },
  };
  const http: any = { post: jest.fn() };
  const config: any = {
    get: (k: string) =>
      k === 'FISCAL_MICROSERVICE_URL'
        ? 'http://fiscal.teste/api/v1'
        : undefined,
  };
  return {
    service: new FiscalService(prisma, http, config, {} as any, {} as any),
    prisma,
    http,
  };
}

const nota = (over: any = {}) => ({
  id: 'd1',
  clinicId: 'c1',
  status: 'PROCESSING',
  uuid: 'uuid-1',
  remoteStatus: 'AWAITING_SEFAZ',
  ...over,
});

describe('FiscalService.tentarNovamente (A11)', () => {
  it('nota aguardando a SEFAZ: POST /nfe/{id}/retry e volta a "em andamento"', async () => {
    const { service, prisma, http } = build(nota());
    http.post.mockReturnValueOnce(
      of({ status: 202, data: { message: 'ok', documentId: 'uuid-1' } }),
    );

    const r = await service.tentarNovamente('d1', 'c1');

    const [url, , opts] = http.post.mock.calls[0];
    expect(url).toBe('http://fiscal.teste/api/v1/nfe/uuid-1/retry');
    expect(opts.headers['X-API-Key']).toBe('k-tenant');
    expect(prisma.fiscalDocument.update.mock.calls[0][0].data).toMatchObject({
      status: 'PROCESSING',
      errorMessage: null,
      remoteStatus: 'PROCESSING',
    });
    expect(r.status).toBe('PROCESSING');
  });

  it('nota com FAILED (falha interna) também pode tentar de novo', async () => {
    const { service, http } = build(
      nota({ status: 'REJECTED', remoteStatus: 'FAILED' }),
    );
    http.post.mockReturnValueOnce(of({ status: 202, data: {} }));
    await expect(service.tentarNovamente('d1', 'c1')).resolves.toBeDefined();
  });

  it('nota rejeitada pela SEFAZ não passa por aqui (exige nova emissão): nada é chamado', async () => {
    for (const remoteStatus of ['REJECTED', 'AUTHORIZED', 'CANCELLED', null]) {
      const { service, http } = build(nota({ remoteStatus }));
      await expect(service.tentarNovamente('d1', 'c1')).rejects.toThrow(
        BadRequestException,
      );
      expect(http.post).not.toHaveBeenCalled();
    }
  });

  it('nota de outra loja ou sem referência no serviço', async () => {
    const a = build(null);
    await expect(a.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      NotFoundException,
    );
    expect(a.prisma.fiscalDocument.findFirst.mock.calls[0][0].where).toEqual({
      id: 'd1',
      clinicId: 'c1',
    });
    const b = build(nota({ uuid: null }));
    await expect(b.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      /sem referência/,
    );
  });

  it('409 do serviço vira Conflict e nada é gravado; falha de rede dá mensagem amigável', async () => {
    const a = build(nota());
    a.http.post.mockReturnValueOnce(
      throwError(() => ({
        response: { status: 409, data: { message: 'Status inválido.' } },
      })),
    );
    await expect(a.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      ConflictException,
    );
    expect(a.prisma.fiscalDocument.update).not.toHaveBeenCalled();

    const b = build(nota());
    b.http.post.mockReturnValueOnce(
      throwError(() => new Error('ECONNREFUSED')),
    );
    await expect(b.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      /Não foi possível falar com o serviço fiscal/,
    );
  });
});

describe('mensagem do serviço fiscal em string pura (visto em homologação)', () => {
  const { mensagemDoServico } = jest.requireActual('./nexos-status');

  it('lê string, { message } e ProblemDetails { title }', () => {
    expect(mensagemDoServico('Documento não encontrado.')).toBe(
      'Documento não encontrado.',
    );
    expect(mensagemDoServico({ message: 'Já existe.' })).toBe('Já existe.');
    expect(mensagemDoServico({ title: 'Erro de validação' })).toBe(
      'Erro de validação',
    );
    expect(mensagemDoServico(undefined)).toBeUndefined();
    expect(mensagemDoServico('   ')).toBeUndefined();
  });

  it('retry: 404 e 409 do serviço chegam ao operador com o texto do próprio serviço', async () => {
    const a = build(nota());
    a.http.post.mockReturnValueOnce(
      throwError(() => ({
        response: { status: 404, data: 'Documento não encontrado.' },
      })),
    );
    await expect(a.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      'Documento não encontrado.',
    );

    const b = build(nota());
    b.http.post.mockReturnValueOnce(
      throwError(() => ({
        response: {
          status: 409,
          data: 'Só notas aguardando a SEFAZ ou com falha podem ser reenviadas (status atual: AUTHORIZED).',
        },
      })),
    );
    await expect(b.service.tentarNovamente('d1', 'c1')).rejects.toThrow(
      /status atual: AUTHORIZED/,
    );
  });
});
