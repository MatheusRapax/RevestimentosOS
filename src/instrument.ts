import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import 'dotenv/config'; // Ensure env vars are loaded early here

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        nodeProfilingIntegration(),
    ],

    // Send structured logs to Sentry
    enableLogs: true,
    // Tracing
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set sampling rate for profiling
    profilesSampleRate: 1.0, // Node SDK uses profilesSampleRate

    // Setting this option to true will send default PII data to Sentry.
    sendDefaultPii: true,
});
