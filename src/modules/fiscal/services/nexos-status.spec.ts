import { FiscalService } from './fiscal.service';
import {
  mapearStatusNexos,
  normalizarAmbiente,
  planejarWebhook,
} from './nexos-status';

describe('mapearStatusNexos (A9)', () => {
  it.each([
    ['AUTHORIZED', 'APPROVED'],
    ['APPROVED', 'APPROVED'],
    ['REJECTED', 'REJECTED'],
    ['DENIED', 'REJECTED'],
    ['FAILED', 'REJECTED'],
    ['CANCELLED', 'CANCELLED'],
    ['CANCELED', 'CANCELLED'],
    ['PENDING', 'PROCESSING'],
    ['PROCESSING', 'PROCESSING'],
    ['AWAITING_SEFAZ', 'PROCESSING'],
    ['awaiting_sefaz', 'PROCESSING'],
  ])('%s → %s', (entrada, esperado) => {
    const r = mapearStatusNexos(entrada);
    expect(r.status).toBe(esperado);
    expect(r.conhecido).toBe(true);
  });

  it('status desconhecido continua em andamento, mas sinalizado', () => {
    expect(mapearStatusNexos('ALGO_NOVO')).toEqual({
      status: 'PROCESSING',
      conhecido: false,
    });
    expect(mapearStatusNexos(undefined)).toEqual({
      status: 'PROCESSING',
      conhecido: false,
    });
  });
});

describe('normalizarAmbiente', () => {
  it('aceita os textos do serviço e os códigos da config local', () => {
    expect(normalizarAmbiente('homologacao')).toBe('homologacao');
    expect(normalizarAmbiente('2')).toBe('homologacao');
    expect(normalizarAmbiente('producao')).toBe('producao');
    expect(normalizarAmbiente('1')).toBe('producao');
    expect(normalizarAmbiente('xyz')).toBeNull();
    expect(normalizarAmbiente(undefined)).toBeNull();
  });
});

const docAutorizado = {
  status: 'APPROVED',
  cancelEventId: null,
  cancelRequestedAt: null,
};

describe('planejarWebhook (A4)', () => {
  it('NFeAuthorized aprova, limpa o erro e guarda chave/xml/danfe (PascalCase ou camelCase)', () => {
    const p: any = planejarWebhook(
      'NFeAuthorized',
      { DocumentId: 'u1', AccessKey: 'K', XmlPath: 'x.xml', PdfPath: 'd.pdf' },
      { status: 'PROCESSING' },
    );
    expect(p.acao).toBe('atualizar');
    expect(p.dados).toMatchObject({
      status: 'APPROVED',
      errorMessage: null,
      uuid: 'u1',
      key: 'K',
      xmlUrl: 'x.xml',
      danfeUrl: 'd.pdf',
    });
  });

  it('NFeRejected rejeita e guarda o motivo', () => {
    const p: any = planejarWebhook(
      'NFeRejected',
      { rejectionReason: 'Rejeição 204' },
      { status: 'PROCESSING' },
    );
    expect(p.dados).toMatchObject({
      status: 'REJECTED',
      errorMessage: 'Rejeição 204',
    });
  });

  it('NFeCanceled cancela e encerra o "cancelamento em andamento"', () => {
    const p: any = planejarWebhook(
      'NFeCanceled',
      { EventId: 'e1' },
      { ...docAutorizado, cancelEventId: 'e1', cancelRequestedAt: new Date() },
    );
    expect(p.dados).toMatchObject({
      status: 'CANCELLED',
      cancelEventId: null,
      cancelRequestedAt: null,
      eventError: null,
    });
  });

  it('EventRejected de cancelamento: nota segue autorizada, guarda o motivo e sai do "em andamento"', () => {
    const p: any = planejarWebhook(
      'EventRejected',
      {
        EventType: 'CANCELLATION',
        Success: false,
        CStat: 501,
        Motivo: 'Prazo de cancelamento excedido',
      },
      { ...docAutorizado, cancelEventId: 'e1', cancelRequestedAt: new Date() },
    );
    expect(p.acao).toBe('atualizar');
    expect(p.dados).not.toHaveProperty('status');
    expect(p.dados).toMatchObject({
      cancelEventId: null,
      cancelRequestedAt: null,
      eventErrorType: 'CANCELLATION',
    });
    expect(p.dados.eventError).toBe(
      'Cancelamento recusado pela SEFAZ: Prazo de cancelamento excedido (cStat 501)',
    );
  });

  it('EventRejected de carta de correção guarda o motivo sem mexer no cancelamento', () => {
    const p: any = planejarWebhook(
      'EventRejected',
      { EventType: 'CORRECTION_LETTER', Motivo: 'Texto inválido' },
      docAutorizado,
    );
    expect(p.dados.eventErrorType).toBe('CORRECTION_LETTER');
    expect(p.dados).not.toHaveProperty('cancelRequestedAt');
    expect(p.dados.eventError).toMatch(
      /^Carta de correção recusado pela SEFAZ: Texto inválido/,
    );
  });

  it('EventRejected de inutilização não pertence a uma nota: ignora', () => {
    expect(
      planejarWebhook(
        'EventRejected',
        { EventType: 'DISABLEMENT' },
        docAutorizado,
      ).acao,
    ).toBe('ignorar');
  });

  it('eventos sem efeito não tocam em nada (A4: não apagar errorMessage)', () => {
    for (const ev of [
      'NFeCorrection',
      'RangeDisabled',
      'EventoNovoQualquer',
      undefined,
    ]) {
      const p = planejarWebhook(
        ev as any,
        { DocumentId: 'u9', AccessKey: 'X' },
        { status: 'REJECTED' },
      );
      expect(p.acao).toBe('ignorar');
    }
  });

  it('NFeDelayed (A11): nota segue em andamento (nunca erro) e guarda o aviso, série, número e ambiente', () => {
    const p: any = planejarWebhook(
      'NFeDelayed',
      {
        DocumentId: 'u1',
        Status: 'AWAITING_SEFAZ',
        Motivo: 'SEFAZ fora do ar',
        Attempts: 2,
        Number: 9,
        Series: 1,
        Environment: 'homologacao',
      },
      { status: 'PROCESSING' },
    );
    expect(p.acao).toBe('atualizar');
    expect(p.dados).toMatchObject({
      status: 'PROCESSING',
      errorMessage: null,
      remoteStatus: 'AWAITING_SEFAZ',
      uuid: 'u1',
      serie: '1',
      number: '9',
      environment: 'homologacao',
    });
    expect(p.dados.statusDetail).toBe(
      'Aguardando a SEFAZ; a nota será emitida automaticamente. Tentativas: 2. Último erro de comunicação: SEFAZ fora do ar',
    );
  });

  it('NFeDelayed: nota que estava rejeitada por falha de envio volta a "em andamento"; concluída é ignorada', () => {
    const p: any = planejarWebhook(
      'NFeDelayed',
      { Motivo: 'timeout' },
      { status: 'REJECTED' },
    );
    expect(p.dados.status).toBe('PROCESSING');
    expect(planejarWebhook('NFeDelayed', {}, { status: 'APPROVED' }).acao).toBe(
      'ignorar',
    );
    expect(
      planejarWebhook('NFeDelayed', {}, { status: 'CANCELLED' }).acao,
    ).toBe('ignorar');
  });

  it('NFeRejected guarda o status bruto: FAILED permite "tentar novamente"', () => {
    const falha: any = planejarWebhook(
      'NFeRejected',
      { Status: 'FAILED', RejectionReason: 'erro interno' },
      { status: 'PROCESSING' },
    );
    expect(falha.dados.remoteStatus).toBe('FAILED');
    const recusa: any = planejarWebhook(
      'NFeRejected',
      { Status: 'REJECTED', RejectionReason: 'Rejeição 204' },
      { status: 'PROCESSING' },
    );
    expect(recusa.dados.remoteStatus).toBe('REJECTED');
  });

  it('webhook atrasado não desfaz um cancelamento', () => {
    expect(
      planejarWebhook('NFeAuthorized', {}, { status: 'CANCELLED' }).acao,
    ).toBe('ignorar');
    expect(
      planejarWebhook('NFeRejected', {}, { status: 'CANCELLED' }).acao,
    ).toBe('ignorar');
  });

  it('B3: série, número e ambiente entram quando o serviço mandar', () => {
    const p: any = planejarWebhook(
      'NFeAuthorized',
      { Series: 1, Number: 42, Environment: 'homologacao' },
      { status: 'PROCESSING' },
    );
    expect(p.dados).toMatchObject({
      serie: '1',
      number: '42',
      environment: 'homologacao',
    });
  });
});

describe('FiscalService.handleWebhook', () => {
  function build(doc: any) {
    const prisma: any = {
      fiscalDocument: {
        findFirst: jest.fn().mockResolvedValue(doc),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new FiscalService(
      prisma,
      {} as any,
      { get: () => undefined } as any,
      {} as any,
      {} as any,
    );
    return { service, prisma };
  }

  it('evento desconhecido responde IGNORED, sem update e sem erro', async () => {
    const { service, prisma } = build({
      id: 'd1',
      status: 'REJECTED',
      errorMessage: 'motivo antigo',
    });
    const r = await service.handleWebhook({
      event: 'EventoNovo',
      data: { ExternalId: 'o1' },
    });
    expect(r.status).toBe('IGNORED');
    expect(prisma.fiscalDocument.update).not.toHaveBeenCalled();
  });

  it('EventRejected grava só o motivo do evento (não zera errorMessage nem o status)', async () => {
    const { service, prisma } = build({
      id: 'd1',
      status: 'APPROVED',
      errorMessage: null,
    });
    const r = await service.handleWebhook({
      event: 'EventRejected',
      data: {
        ExternalId: 'o1',
        EventType: 'CANCELLATION',
        Motivo: 'fora do prazo',
        CStat: 501,
      },
    });
    expect(r.status).toBe('SUCCESS');
    const dados = prisma.fiscalDocument.update.mock.calls[0][0].data;
    expect(dados).not.toHaveProperty('status');
    expect(dados).not.toHaveProperty('errorMessage');
    expect(dados.eventError).toMatch(/fora do prazo \(cStat 501\)/);
  });

  it('payload sem dados ou sem externalId é ignorado', async () => {
    const { service, prisma } = build(null);
    expect(
      (await service.handleWebhook({ event: 'NFeAuthorized' })).status,
    ).toBe('IGNORED');
    expect(
      (await service.handleWebhook({ event: 'NFeAuthorized', data: {} }))
        .status,
    ).toBe('IGNORED');
    expect(prisma.fiscalDocument.findFirst).not.toHaveBeenCalled();
  });

  it('documento inexistente não gera erro', async () => {
    const { service } = build(null);
    const r = await service.handleWebhook({
      event: 'NFeAuthorized',
      data: { ExternalId: 'x' },
    });
    expect(r.status).toBe('NOT_FOUND');
  });
});

import {
  planejarCancelamentoPendente,
  planejarReconciliacao,
} from './nexos-status';

describe('planejarReconciliacao (A7)', () => {
  const remota = (over: any = {}) => ({
    id: 'u1',
    externalId: 'o1',
    status: 'AUTHORIZED',
    accessKey: 'K44',
    environment: 'homologacao',
    series: 1,
    number: 7,
    ...over,
  });

  it('corrige uma autorização perdida e guarda série, número, ambiente e chave', () => {
    const d: any = planejarReconciliacao(
      { status: 'PROCESSING', uuid: null, key: null },
      remota(),
    );
    expect(d).toMatchObject({
      status: 'APPROVED',
      errorMessage: null,
      uuid: 'u1',
      key: 'K44',
      environment: 'homologacao',
      serie: '1',
      number: '7',
    });
  });

  it('nota já correta e completa não gera atualização', () => {
    const local = {
      status: 'APPROVED',
      remoteStatus: 'AUTHORIZED',
      uuid: 'u1',
      key: 'K44',
      environment: 'homologacao',
      serie: '1',
      number: '7',
    };
    expect(planejarReconciliacao(local, remota())).toBeNull();
  });

  it('só completa os campos de acompanhamento sem mexer no status', () => {
    const d: any = planejarReconciliacao(
      { status: 'APPROVED', uuid: 'u1', key: 'K44' },
      remota(),
    );
    expect(d).toEqual({
      remoteStatus: 'AUTHORIZED',
      environment: 'homologacao',
      serie: '1',
      number: '7',
    });
  });

  it('rejeição e FAILED viram rejeitada com o motivo', () => {
    expect(
      (
        planejarReconciliacao(
          { status: 'PROCESSING', uuid: 'u1' },
          remota({ status: 'REJECTED', rejectionReason: 'Rejeição 204' }),
        ) as any
      ).errorMessage,
    ).toBe('Rejeição 204');
    expect(
      (
        planejarReconciliacao(
          { status: 'PROCESSING', uuid: 'u1' },
          remota({ status: 'FAILED', rejectionReason: null }),
        ) as any
      ).errorMessage,
    ).toMatch(/Falha definitiva/);
  });

  it('AWAITING_SEFAZ nunca vira erro: nota rejeitada por falha de envio volta a "em andamento"', () => {
    const d: any = planejarReconciliacao(
      {
        status: 'REJECTED',
        uuid: 'u1',
        key: 'K44',
        environment: 'homologacao',
        serie: '1',
        number: '7',
      },
      remota({
        status: 'AWAITING_SEFAZ',
        rejectionReason: 'timeout ao falar com a SEFAZ',
      }),
    );
    expect(d).toEqual({
      status: 'PROCESSING',
      errorMessage: null,
      remoteStatus: 'AWAITING_SEFAZ',
      statusDetail:
        'Aguardando a SEFAZ; a nota será emitida automaticamente. Último erro de comunicação: timeout ao falar com a SEFAZ',
    });
  });

  it('AWAITING_SEFAZ já refletido localmente não gera atualização; ao autorizar, o aviso some', () => {
    const espera = {
      status: 'PROCESSING',
      remoteStatus: 'AWAITING_SEFAZ',
      statusDetail:
        'Aguardando a SEFAZ; a nota será emitida automaticamente. Tentativas: 3.',
      uuid: 'u1',
      key: 'K44',
      environment: 'homologacao',
      serie: '1',
      number: '7',
    };
    expect(
      planejarReconciliacao(
        espera,
        remota({ status: 'AWAITING_SEFAZ', attempts: 3 }),
      ),
    ).toBeNull();
    const d: any = planejarReconciliacao(espera, remota());
    expect(d).toMatchObject({
      status: 'APPROVED',
      remoteStatus: 'AUTHORIZED',
      statusDetail: null,
    });
  });

  it('leitura atrasada não rebaixa nota autorizada', () => {
    const d: any = planejarReconciliacao(
      { status: 'APPROVED', uuid: 'u1', key: 'K44' },
      remota({ status: 'PENDING' }),
    );
    expect(d).not.toHaveProperty('status');
  });

  it('nota cancelada localmente não volta atrás', () => {
    const d: any = planejarReconciliacao(
      { status: 'CANCELLED', uuid: 'u1', key: 'K44' },
      remota({ status: 'AUTHORIZED' }),
    );
    expect(d).not.toHaveProperty('status');
  });

  it('cancelamento confirmado no serviço encerra o "em andamento"', () => {
    const d: any = planejarReconciliacao(
      {
        status: 'APPROVED',
        uuid: 'u1',
        cancelRequestedAt: new Date(),
        cancelEventId: 'e1',
      },
      remota({ status: 'CANCELLED' }),
    );
    expect(d).toMatchObject({
      status: 'CANCELLED',
      cancelRequestedAt: null,
      cancelEventId: null,
    });
  });
});

describe('planejarCancelamentoPendente (A7)', () => {
  const pendente = {
    status: 'APPROVED',
    cancelEventId: 'e1',
    cancelRequestedAt: new Date(),
  };

  it('evento recusado e webhook perdido: volta ao normal com o motivo', () => {
    const d: any = planejarCancelamentoPendente(pendente, [
      {
        id: 'e1',
        type: 'CANCELLATION',
        status: 'REJECTED',
        cStat: 501,
        motivo: 'Prazo excedido',
      },
    ]);
    expect(d).not.toHaveProperty('status');
    expect(d).toMatchObject({
      cancelRequestedAt: null,
      eventErrorType: 'CANCELLATION',
    });
    expect(d.eventError).toBe(
      'Cancelamento recusado pela SEFAZ: Prazo excedido (cStat 501)',
    );
  });

  it('evento autorizado: nota cancelada', () => {
    const d: any = planejarCancelamentoPendente(pendente, [
      { id: 'e1', type: 'CANCELLATION', status: 'AUTHORIZED' },
    ]);
    expect(d.status).toBe('CANCELLED');
  });

  it('evento ainda pendente, de outro tipo/outro id ou sem pedido local: nada a fazer', () => {
    expect(
      planejarCancelamentoPendente(pendente, [
        { id: 'e1', type: 'CANCELLATION', status: 'PENDING' },
      ]),
    ).toBeNull();
    expect(
      planejarCancelamentoPendente(pendente, [
        { id: 'x', type: 'CANCELLATION', status: 'REJECTED' },
      ]),
    ).toBeNull();
    expect(
      planejarCancelamentoPendente(pendente, [
        { id: 'e1', type: 'CORRECTION_LETTER', status: 'REJECTED' },
      ]),
    ).toBeNull();
    expect(
      planejarCancelamentoPendente({ status: 'APPROVED' }, [
        { id: 'e1', type: 'CANCELLATION', status: 'REJECTED' },
      ]),
    ).toBeNull();
  });
});
