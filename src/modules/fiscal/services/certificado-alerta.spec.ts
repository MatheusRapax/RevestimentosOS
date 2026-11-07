import {
  avaliarAlertaCertificado,
  dataDeValidade,
  lerEventoCertificado,
  nivelPelosDias,
} from './certificado-alerta';
import { FiscalService } from './fiscal.service';

const AGORA = new Date('2026-11-07T12:00:00Z');
const emDias = (d: number, h = 1) =>
  new Date(AGORA.getTime() + d * 86_400_000 + h * 3_600_000);

describe('certificado-alerta: faixas e mensagens', () => {
  it.each([
    [61, null],
    [60, 'warning'],
    [16, 'warning'],
    [15, 'critical'],
    [1, 'critical'],
    [0, 'expired'],
    [-3, 'expired'],
  ])('%i dias → %s (mesmas faixas do serviço)', (dias, nivel) => {
    expect(nivelPelosDias(dias)).toBe(nivel);
  });

  it('sem validade ou longe do vencimento: sem aviso', () => {
    expect(avaliarAlertaCertificado(null, AGORA)).toBeNull();
    expect(avaliarAlertaCertificado(undefined, AGORA)).toBeNull();
    expect(avaliarAlertaCertificado(emDias(200), AGORA)).toBeNull();
  });

  it('a vencer: diz quantos dias e pede o novo A1', () => {
    const a = avaliarAlertaCertificado(emDias(30), AGORA);
    expect(a?.nivel).toBe('warning');
    expect(a?.diasRestantes).toBe(30);
    expect(a?.mensagem).toBe(
      'Certificado digital vence em 30 dias: renove e envie o novo A1 em Configuração Fiscal.',
    );
  });

  it('um dia: singular', () => {
    expect(avaliarAlertaCertificado(emDias(1), AGORA)?.mensagem).toContain(
      'vence em 1 dia:',
    );
  });

  it('os dias são recalculados: o mesmo certificado piora com o tempo, sem novo webhook', () => {
    const notAfter = emDias(20);
    expect(avaliarAlertaCertificado(notAfter, AGORA)?.nivel).toBe('warning');
    const depois = new Date(AGORA.getTime() + 10 * 86_400_000);
    const a = avaliarAlertaCertificado(notAfter, depois);
    expect(a?.nivel).toBe('critical');
    expect(a?.diasRestantes).toBe(10);
  });

  it('vencido: avisa que nenhuma nota será emitida', () => {
    const a = avaliarAlertaCertificado(new Date('2026-11-01T12:00:00Z'), AGORA);
    expect(a?.nivel).toBe('expired');
    expect(a?.mensagem).toMatch(/vencido desde 01\/11\/2026/);
    expect(a?.mensagem).toMatch(
      /nenhuma nota será emitida até enviar um certificado novo/,
    );
  });

  it('vence hoje, ainda válido por horas: não diz que já venceu', () => {
    const a = avaliarAlertaCertificado(emDias(0, 5), AGORA);
    expect(a?.nivel).toBe('expired');
    expect(a?.mensagem).toMatch(/vence hoje/);
    expect(a?.mensagem).not.toMatch(/vencido/);
  });

  it('data 0001-01-01 (certificado ilegível no serviço) não vale como validade', () => {
    expect(dataDeValidade('0001-01-01T00:00:00Z')).toBeNull();
    expect(dataDeValidade('xpto')).toBeNull();
    expect(dataDeValidade(null)).toBeNull();
    expect(dataDeValidade('2027-01-01T00:00:00Z')).toBeInstanceOf(Date);
  });
});

describe('certificado-alerta: leitura do webhook', () => {
  const pascal = {
    TenantId: 't1',
    TenantName: 'Loja',
    Subject: 'CN=LOJA',
    Cnpj: '42580788000100',
    NotAfter: '2026-12-01T00:00:00Z',
    DaysLeft: 23,
    Level: 'warning',
  };

  it('aceita PascalCase, que é o que o serviço envia', () => {
    expect(lerEventoCertificado(pascal)).toEqual({
      tenantId: 't1',
      notAfter: new Date('2026-12-01T00:00:00Z'),
    });
  });

  it('aceita camelCase, como o contrato resume', () => {
    expect(
      lerEventoCertificado({
        tenantId: 't1',
        notAfter: '2026-12-01T00:00:00Z',
      })?.tenantId,
    ).toBe('t1');
  });

  it('recusa corpo sem tenant ou sem validade', () => {
    expect(lerEventoCertificado({ NotAfter: pascal.NotAfter })).toBeNull();
    expect(lerEventoCertificado({ TenantId: 't1' })).toBeNull();
    expect(lerEventoCertificado(null)).toBeNull();
  });
});

describe('FiscalService: webhook CertificateExpiring', () => {
  function build(count = 1, salvo: Date | null = null) {
    const prisma: any = {
      clinicFiscalConfig: {
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateNotAfter: salvo }),
      },
      fiscalDocument: { findFirst: jest.fn(), update: jest.fn() },
    };
    const service = new FiscalService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, prisma };
  }
  const corpo = {
    TenantId: 't1',
    NotAfter: '2026-12-01T00:00:00Z',
    DaysLeft: 23,
    Level: 'warning',
  };

  it('grava a validade pelo tenant, sem procurar nota', async () => {
    const { service, prisma } = build();
    const r = await service.handleWebhook({
      event: 'CertificateExpiring',
      data: corpo,
    });
    expect(r.status).toBe('SUCCESS');
    const arg = prisma.clinicFiscalConfig.updateMany.mock.calls[0][0];
    expect(arg.where.nexosTenantId).toBe('t1');
    expect(arg.data.certificateNotAfter).toEqual(new Date(corpo.NotAfter));
    expect(arg.data.certificateAlertAt).toBeInstanceOf(Date);
    expect(prisma.fiscalDocument.findFirst).not.toHaveBeenCalled();
  });

  it('não sobrescreve validade mais nova (reentrega atrasada do certificado antigo)', async () => {
    const { service, prisma } = build(0);
    const r = await service.handleWebhook({
      event: 'CertificateExpiring',
      data: corpo,
    });
    expect(r.status).toBe('IGNORED');
    expect(prisma.clinicFiscalConfig.updateMany.mock.calls[0][0].where.OR).toEqual(
      [
        { certificateNotAfter: null },
        { certificateNotAfter: { lte: new Date(corpo.NotAfter) } },
      ],
    );
  });

  it('corpo inválido é ignorado com sucesso, para o serviço não reentregar', async () => {
    const { service, prisma } = build();
    const r = await service.handleWebhook({
      event: 'CertificateExpiring',
      data: { Level: 'warning' },
    });
    expect(r.status).toBe('IGNORED');
    expect(prisma.clinicFiscalConfig.updateMany).not.toHaveBeenCalled();
  });

  it('o aviso da loja vem da validade guardada', async () => {
    const venceLogo = new Date(Date.now() + 10.5 * 86_400_000);
    const { service } = build(1, venceLogo);
    const r = await service.getCertificateAlert('c1');
    expect(r.alerta?.nivel).toBe('critical');
    expect(r.alerta?.diasRestantes).toBe(10);
  });

  it('loja sem validade guardada: sem aviso', async () => {
    const { service } = build(1, null);
    expect((await service.getCertificateAlert('c1')).alerta).toBeNull();
  });
});
