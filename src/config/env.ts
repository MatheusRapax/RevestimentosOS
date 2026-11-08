export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'changeme',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
};

/**
 * Valores de JWT_SECRET que estão escritos no código ou nos exemplos do repositório: quem os conhece
 * consegue assinar um token válido e entrar como qualquer usuário.
 */
export const JWT_SECRETS_DE_EXEMPLO = [
  'changeme',
  'your-super-secret-jwt-key-change-in-production',
];

/**
 * Problemas do ambiente que impedem o backend de subir. Em produção, JWT_SECRET vazia ou de exemplo
 * é recusada (A21): antes só havia um aviso e o servidor seguia com 'changeme'.
 */
export function problemasDoAmbiente(
  vars: Record<string, string | undefined> = process.env,
): string[] {
  const problemas: string[] = [];
  if (!vars.DATABASE_URL) {
    problemas.push('DATABASE_URL environment variable is required');
  }
  const segredo = (vars.JWT_SECRET ?? '').trim();
  if (
    vars.NODE_ENV === 'production' &&
    (!segredo || JWT_SECRETS_DE_EXEMPLO.includes(segredo))
  ) {
    problemas.push(
      'JWT_SECRET vazia ou com valor de exemplo em produção: defina um segredo longo e aleatório ' +
        '(ex.: openssl rand -base64 48) nas variáveis do servidor. O backend não sobe sem ele, ' +
        'porque com o valor padrão qualquer um consegue forjar um login.',
    );
  }
  return problemas;
}

export function validateEnv(
  vars: Record<string, string | undefined> = process.env,
): void {
  const problemas = problemasDoAmbiente(vars);
  if (problemas.length) {
    throw new Error(problemas.join(' | '));
  }

  const segredo = (vars.JWT_SECRET ?? '').trim();
  if (!segredo || JWT_SECRETS_DE_EXEMPLO.includes(segredo)) {
    console.warn(
      '⚠️  WARNING: Using default JWT_SECRET. Please set a secure secret in production!',
    );
  }
}
