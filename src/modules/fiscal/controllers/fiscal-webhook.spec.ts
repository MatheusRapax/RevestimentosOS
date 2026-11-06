import * as crypto from 'crypto';
import { FiscalController } from './fiscal.controller';

const SEGREDO = 'segredo-forte-de-teste-1234567890';

const assinar = (corpo: string, segredo = SEGREDO) =>
  crypto.createHmac('sha256', segredo).update(corpo).digest('base64');

function chamar(opts: {
  segredoNoEnv?: string;
  producao?: boolean;
  assinatura?: string | null;
  corpo?: any;
}) {
  const antes = { ...process.env };
  if (opts.segredoNoEnv === undefined) delete process.env.FISCAL_WEBHOOK_SECRET;
  else process.env.FISCAL_WEBHOOK_SECRET = opts.segredoNoEnv;
  process.env.NODE_ENV = opts.producao ? 'production' : 'test';

  const fiscalService: any = {
    handleWebhook: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  };
  const controller = new FiscalController(fiscalService, {} as any);
  const corpo = opts.corpo ?? { DocumentId: 'u1', ExternalId: 'o1' };
  const bruto = Buffer.from(JSON.stringify(corpo));
  const req: any = {
    headers: {
      'x-webhook-event': 'NFeAuthorized',
      ...(opts.assinatura === null
        ? {}
        : {
            'x-webhook-signature': opts.assinatura ?? assinar(bruto.toString()),
          }),
    },
    rawBody: bruto,
    body: corpo,
  };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return {
    run: async () => {
      try {
        await controller.handleWebhook(req, res);
      } finally {
        process.env = antes;
      }
      return { res, fiscalService };
    },
  };
}

describe('FiscalController.handleWebhook — segredo e assinatura', () => {
  it('produção sem FISCAL_WEBHOOK_SECRET: recusa (503) em vez de usar segredo fixo conhecido', async () => {
    const { res, fiscalService } = await chamar({ producao: true }).run();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(fiscalService.handleWebhook).not.toHaveBeenCalled();
  });

  it('produção com o valor de exemplo também é recusada', async () => {
    for (const exemplo of [
      'uma-senha-secreta-para-hmac',
      'troque-por-um-segredo-aleatorio-forte',
    ]) {
      const { res } = await chamar({
        producao: true,
        segredoNoEnv: exemplo,
      }).run();
      expect(res.status).toHaveBeenCalledWith(503);
    }
  });

  it('produção com segredo próprio e assinatura correta: processa', async () => {
    const { res, fiscalService } = await chamar({
      producao: true,
      segredoNoEnv: SEGREDO,
    }).run();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(fiscalService.handleWebhook).toHaveBeenCalledTimes(1);
    expect(fiscalService.handleWebhook.mock.calls[0][0].event).toBe(
      'NFeAuthorized',
    );
  });

  it('assinatura errada (ou assinada com o segredo antigo conhecido) é recusada em produção', async () => {
    const corpo = JSON.stringify({ DocumentId: 'u1', ExternalId: 'o1' });
    const forjada = assinar(corpo, 'uma-senha-secreta-para-hmac');
    const { res, fiscalService } = await chamar({
      producao: true,
      segredoNoEnv: SEGREDO,
      assinatura: forjada,
    }).run();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(fiscalService.handleWebhook).not.toHaveBeenCalled();
  });

  it('sem cabeçalho de assinatura: 401', async () => {
    const { res } = await chamar({
      segredoNoEnv: SEGREDO,
      assinatura: null,
    }).run();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('fora de produção, sem segredo no ambiente, segue funcionando com o fixo (não quebra o dev)', async () => {
    const corpo = JSON.stringify({ DocumentId: 'u1', ExternalId: 'o1' });
    const { res, fiscalService } = await chamar({
      assinatura: assinar(corpo, 'uma-senha-secreta-para-hmac'),
    }).run();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(fiscalService.handleWebhook).toHaveBeenCalled();
  });
});
