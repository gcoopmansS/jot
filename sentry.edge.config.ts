// Sentry initialization for the Edge runtime (middleware, edge API routes).
// Loaded by instrumentation.ts - no import needed elsewhere.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
