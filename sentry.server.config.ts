// Sentry initialization for the Node.js server runtime (API routes, server
// components). Loaded by instrumentation.ts - no import needed elsewhere.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
