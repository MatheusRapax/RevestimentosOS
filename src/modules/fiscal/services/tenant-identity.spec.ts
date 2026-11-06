import { BadRequestException } from '@nestjs/common';
import {
  divergenciasSetupVsPerfil,
  montarIdentidadeTenant,
  PerfilEmitente,
} from './tenant-identity';

const perfilCompleto = (over: Partial<PerfilEmitente> = {}): PerfilEmitente => ({
  cnpj: '42580788000100',
  ie: '123456789',
  im: null,
  crt: 1,
  logradouro: 'RUA TESTE',
  numero: '08',
  complemento: 'QUADRA25',
  bairro: 'COHAMA',
  municipioIbge: '2111300',
  municipioNome: 'SAO LUIS',
  uf: 'MA',
  cep: '65073-830',
  ...over,
});

describe('montarIdentidadeTenant', () => {
  it('monta a identidade completa, com endereço e CEP só com dígitos', () => {
    const { identidade, avisos } = montarIdentidadeTenant(perfilCompleto());
    expect(identidade).toEqual({
      cnpj: '42580788000100',
      ie: '123456789',
      im: undefined,
      crt: 1,
      uf: 'MA',
      cityCode: '2111300',
      address: {
        logradouro: 'RUA TESTE',
        numero: '08',
        complemento: 'QUADRA25',
        bairro: 'COHAMA',
        municipio: 'SAO LUIS',
        cep: '65073830',
      },
    });
    expect(avisos).toEqual([]);
  });

  it('CRT ausente é erro claro (sem padrão silencioso 3)', () => {
    expect(() => montarIdentidadeTenant(perfilCompleto({ crt: null }))).toThrow(
      /Regime Tributário \(CRT\) não informado/,
    );
    expect(() => montarIdentidadeTenant(perfilCompleto({ crt: undefined }))).toThrow(
      BadRequestException,
    );
  });

  it('IBGE que não pertence à UF é erro', () => {
    expect(() =>
      montarIdentidadeTenant(perfilCompleto({ municipioIbge: '3550308' })),
    ).toThrow(/não pertence à UF MA/);
  });

  it('endereço incompleto lista o que falta', () => {
    expect(() =>
      montarIdentidadeTenant(perfilCompleto({ logradouro: '', cep: '123' })),
    ).toThrow(/faltam Logradouro, CEP \(8 dígitos\)/);
  });

  it('campo de endereço acima de 60 caracteres é erro', () => {
    expect(() =>
      montarIdentidadeTenant(perfilCompleto({ bairro: 'X'.repeat(61) })),
    ).toThrow(/Bairro .* passa de 60/);
  });

  it('avisa (sem bloquear) para IE ISENTO, IE vazia e logradouro com "/"', () => {
    const isento = montarIdentidadeTenant(
      perfilCompleto({ ie: 'isento', logradouro: 'RUA A/R. B' }),
    );
    expect(isento.identidade.ie).toBe('ISENTO');
    expect(isento.avisos.join(' ')).toMatch(/ISENTO/);
    expect(isento.avisos.join(' ')).toMatch(/contém "\/"/);

    const semIe = montarIdentidadeTenant(perfilCompleto({ ie: '' }));
    expect(semIe.identidade.ie).toBeUndefined();
    expect(semIe.avisos.join(' ')).toMatch(/Inscrição Estadual não informada/);
  });

  it('normaliza a IE para só dígitos e rejeita lixo', () => {
    expect(montarIdentidadeTenant(perfilCompleto({ ie: '12.345.678-9' })).identidade.ie).toBe(
      '123456789',
    );
    expect(() => montarIdentidadeTenant(perfilCompleto({ ie: 'ABC' }))).toThrow(
      /Inscrição Estadual inválida/,
    );
  });
});

describe('divergenciasSetupVsPerfil', () => {
  it('campos vazios ou iguais ao perfil não divergem', () => {
    expect(divergenciasSetupVsPerfil({}, perfilCompleto())).toEqual([]);
    expect(
      divergenciasSetupVsPerfil(
        { document: '42.580.788/0001-00', uf: 'ma', cityCode: '2111300', crt: '1' },
        perfilCompleto(),
      ),
    ).toEqual([]);
  });

  it('lista cada divergência', () => {
    const d = divergenciasSetupVsPerfil(
      { document: '09608606000119', uf: 'SP', cityCode: '3550308', crt: '3', ie: 'ISENTO' },
      perfilCompleto(),
    );
    expect(d).toHaveLength(5);
    expect(d.join(' ')).toMatch(/CNPJ/);
    expect(d.join(' ')).toMatch(/UF/);
    expect(d.join(' ')).toMatch(/IBGE/);
    expect(d.join(' ')).toMatch(/CRT/);
    expect(d.join(' ')).toMatch(/Inscrição Estadual/);
  });
});
