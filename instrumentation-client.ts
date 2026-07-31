// Sentry initialization for the browser. Next.js loads this automatically
// on the client - no import needed anywhere else.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Basic error capture only for now - no session replay or performance
  // tracing, to keep this simple and stay comfortably within the free tier.
  tracesSampleRate: 0,
});

// Required by the SDK so client-side route changes are tracked correctly,
// even with tracing disabled above.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
