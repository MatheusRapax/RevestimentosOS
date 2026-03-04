import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: "https://0d6cdbb38b7d890d8ac8205fbc5506ae@o4510982326190080.ingest.us.sentry.io/4510982328483840",
    sendDefaultPii: true, // as requested
    tracesSampleRate: 1.0,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/api\.moa\.software/],
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],
});
