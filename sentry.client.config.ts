import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Capture 100% of errors, sample 10% of transactions
  tracesSampleRate: 0.1,

  // Disable replay in production to save quota
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})
