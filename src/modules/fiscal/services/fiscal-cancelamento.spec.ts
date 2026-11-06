import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FiscalService } from './fiscal.service';

const JUSTIFICATIVA = 'Cliente desistiu da compra antes do envio';

function build(doc: any) {
  const prisma: any = {
    fiscalDocument: {
      findFirst: jest.fn().mockResolvedValue(doc),
      update: jest.fn().mockResolvedValue({}),
    },
    clinicFiscalConfig: { findUnique: jest.fn().mockResolvedValue({ nexosApiKey: 'k-tenant' }) },
  };
  const http: any = { post: jest.fn() };
  const config: any = { get: (k: string) => (k === 'FISCAL_MICROSERVICE_URL' ? 'http://fiscal.teste/api/v1' : undefined) };
  const service = new FiscalService(prisma, http, config, {} as any, {} as any);
  return { service, prisma, http };
}

const autorizada = (over: any = {}) => ({
  id: 'd1',
  clinicId: 'c1',
  status: 'APPROVED',
  uuid: 'uuid-1',
  cancelRequestedAt: null,
  ...over,
});

describe('FiscalService.cancelarNota (A3)', () => {
  it('202: marca "cancelamento em andamento" e NÃO muda o status da nota', async () => {
    const { service, prisma, http } = build(autorizada());
    http.post.mockReturnValueOnce(of({ status: 202, data: { message: 'Evento enfileirado.', eventId: 'ev-1' } }));

    const r = await service.cancelarNota('d1', 'c1', JUSTIFICATIVA);

    const [url, body, opts] = http.post.mock.calls[0];
    expect(url).toBe('http://fiscal.teste/api/v1/nfe/uuid-1/cancel');
    expect(body).toEqual({ justificativa: JUSTIFICATIVA });
    expect(opts.headers['X-API-Key']).toBe('k-tenant');
    const dados = prisma.fiscalDocument.update.mock.calls[0][0].data;
    expect(dados).toMatchObject({ cancelEventId: 'ev-1', cancelJustification: JUSTIFICATIVA, eventError: null });
    expect(dados.cancelRequestedAt).toBeInstanceOf(Date);
    expect(dados).not.toHaveProperty('status'); // só o webhook NFeCanceled cancela de verdade
    expect(r.status).toBe('CANCELLING');
    expect(r.message).toMatch(/SEFAZ confirmar/);
  });

  it('justificativa fora de 15–255 caracteres: erro antes de qualquer chamada', async () => {
    const { service, http } = build(autorizada());
    await expect(service.cancelarNota('d1', 'c1', 'curta demais')).rejects.toThrow(/15 a 255/);
    await expect(service.cancelarNota('d1', 'c1', 'x'.repeat(256))).rejects.toThrow(/15 a 255/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('só nota autorizada pode ser cancelada', async () => {
    for (const status of ['PROCESSING', 'REJECTED', 'CANCELLED']) {
      const { service, http } = build(autorizada({ status }));
      await expect(service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow(BadRequestException);
      expect(http.post).not.toHaveBeenCalled();
    }
  });

  it('já há cancelamento em andamento: 409 sem chamar o serviço', async () => {
    const { service, http } = build(autorizada({ cancelRequestedAt: new Date() }));
    await expect(service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow(ConflictException);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('nota de outra loja ou inexistente: não encontrada', async () => {
    const { service, prisma } = build(null);
    await expect(service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow(NotFoundException);
    expect(prisma.fiscalDocument.findFirst.mock.calls[0][0].where).toEqual({ id: 'd1', clinicId: 'c1' });
  });

  it('409 do serviço vira ConflictException e nada é gravado', async () => {
    const { service, prisma, http } = build(autorizada());
    http.post.mockReturnValueOnce(
      throwError(() => ({ response: { status: 409, data: { message: 'Já existe cancelamento pendente.' } } })),
    );
    await expect(service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow(ConflictException);
    expect(prisma.fiscalDocument.update).not.toHaveBeenCalled();
  });

  it('400 do serviço mostra a mensagem dele; falha de rede dá mensagem amigável', async () => {
    const a = build(autorizada());
    a.http.post.mockReturnValueOnce(
      throwError(() => ({ response: { status: 400, data: { message: 'A nota não está autorizada.' } } })),
    );
    await expect(a.service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow('A nota não está autorizada.');

    const b = build(autorizada());
    b.http.post.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    await expect(b.service.cancelarNota('d1', 'c1', JUSTIFICATIVA)).rejects.toThrow(/Não foi possível falar com o serviço fiscal/);
    expect(b.prisma.fiscalDocument.update).not.toHaveBeenCalled();
  });
});
