// src/instrument.js
// Sentry must be initialized before any other imports
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // Only enable in production
  enabled: import.meta.env.PROD,

  // Performance monitoring — sample 20% of transactions
  tracesSampleRate: 0.2,

  // Session replay for debugging — capture 10% of sessions,
  // but 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

  // Don't send errors from local development
  beforeSend(event) {
    if (window.location.hostname === "localhost") {
      return null;
    }
    return event;
  },
});
