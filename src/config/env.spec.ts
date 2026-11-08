import { problemasDoAmbiente, validateEnv } from './env';

const DB = 'postgresql://u:p@db:5432/x';
const FORTE = 'k3c9V2pX8wQ1zR7mN4bT6yH0jL5aS2dF9gE3uI8oP1q';

describe('env: JWT_SECRET em produção (A21)', () => {
  it.each([
    ['ausente', undefined],
    ['vazia', ''],
    ['só espaços', '   '],
    ['changeme', 'changeme'],
    [
      'exemplo do docker-compose',
      'your-super-secret-jwt-key-change-in-production',
    ],
  ])('recusa subir com JWT_SECRET %s', (_nome, valor) => {
    const vars = {
      NODE_ENV: 'production',
      DATABASE_URL: DB,
      JWT_SECRET: valor,
    };
    expect(problemasDoAmbiente(vars)).toHaveLength(1);
    expect(() => validateEnv(vars)).toThrow(
      /JWT_SECRET vazia ou com valor de exemplo/,
    );
  });

  it('sobe com segredo próprio em produção', () => {
    const vars = {
      NODE_ENV: 'production',
      DATABASE_URL: DB,
      JWT_SECRET: FORTE,
    };
    expect(problemasDoAmbiente(vars)).toEqual([]);
    expect(() => validateEnv(vars)).not.toThrow();
  });

  it('fora de produção só avisa (desenvolvimento continua funcionando)', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(() =>
        validateEnv({ NODE_ENV: 'development', DATABASE_URL: DB }),
      ).not.toThrow();
      expect(aviso).toHaveBeenCalled();
    } finally {
      aviso.mockRestore();
    }
  });

  it('continua exigindo DATABASE_URL', () => {
    expect(() =>
      validateEnv({ NODE_ENV: 'production', JWT_SECRET: FORTE }),
    ).toThrow(/DATABASE_URL/);
  });
});
