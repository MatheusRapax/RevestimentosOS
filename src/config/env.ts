export const env = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'changeme',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
};

export function validateEnv(): void {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'changeme') {
        console.warn(
            '⚠️  WARNING: Using default JWT_SECRET. Please set a secure secret in production!',
        );
    }
}
