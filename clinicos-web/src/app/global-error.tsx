'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <h1>Algo deu errado!</h1>
                <p>Um erro inesperado aconteceu e já foi enviado para a nossa equipe.</p>
                {/* Usamos o fallback do next/error para renderizar algo */}
                <Error statusCode={500} />
            </body>
        </html>
    );
}
