/** @type {import('next').NextConfig} */

// Prod MinIO host — set NEXT_PUBLIC_MINIO_HOST on your server (e.g. "192.168.1.10" or "minio.yourdomain.com")
// NEXT_PUBLIC_MINIO_PROTOCOL defaults to "http", set to "https" if behind SSL
// NEXT_PUBLIC_MINIO_PORT defaults to "9000"
const minioHost     = process.env.NEXT_PUBLIC_MINIO_HOST
const minioProtocol = process.env.NEXT_PUBLIC_MINIO_PROTOCOL || 'http'
const minioPort     = process.env.NEXT_PUBLIC_MINIO_PORT     || '9000'

// ── CSP host allowlists — DERIVED, never hardcoded ──
// These used to be literal hostnames and silently went stale during the
// 2026-07 account migration: connect-src still named the old Render backend,
// so every browser-side API call was CSP-blocked in prod while the ISR
// homepage (server-side fetch, no CSP) kept looking healthy. Derive them from
// the same env vars the app already uses so they cannot drift again.
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL // e.g. https://host/api
  if (!raw) return 'http://localhost:8080'    // local default (backend dev port)
  try { return new URL(raw).origin } catch { return 'http://localhost:8080' }
})()

// Image CDN: the R2 public bucket. Wildcard covers any r2.dev bucket id, and
// NEXT_PUBLIC_MINIO_HOST covers a custom/self-hosted CDN host when set.
const imgHosts = [
  'https://*.r2.dev',
  // Port only when explicitly configured — minioPort's '9000' default is for
  // local docker MinIO and would wrongly port-scope a prod CDN host.
  ...(minioHost
    ? [`${minioProtocol}://${minioHost}${process.env.NEXT_PUBLIC_MINIO_PORT ? `:${process.env.NEXT_PUBLIC_MINIO_PORT}` : ''}`]
    : []),
]

// Sentry ingest. Newer Sentry orgs are region-scoped (o123.ingest.us.sentry.io),
// which does NOT match *.ingest.sentry.io — allow both forms.
const sentryHosts = ['https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io']

// ── HTTP security headers (OWASP A02: Security Misconfiguration) ──
// Applied to every route. The CSP includes Google Maps hosts; a wrong CSP
// silently breaks Next's inline scripts/styles and map embeds, so verify on
// a Vercel preview (maps/images/Sentry must load) before trusting in prod.
const securityHeaders = [
  // Force HTTPS for 2 years incl. subdomains (Vercel serves HTTPS already)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disallow being framed by other origins (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs in the Referer header cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop access to powerful browser features we don't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // ponytail: verify on a Vercel preview (maps/images/Sentry must still load) before trusting in prod
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next needs inline/eval; maps.googleapis.com serves the Maps JS API
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: ${imgHosts.join(' ')} https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com`,
      `connect-src 'self' ${apiOrigin} ${sentryHosts.join(' ')} https://maps.googleapis.com`,
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      // Prod images — Cloudflare R2 public CDN (next/image needs the host whitelisted)
      { protocol: 'https', hostname: '**.r2.dev' },
      // Dev MinIO (docker-compose port 9000)
      { protocol: 'http',  hostname: 'localhost', port: '9000' },
      // Dev local file upload (backend at :8080/uploads/)
      { protocol: 'http',  hostname: 'localhost', port: '8080' },
      // Prod MinIO — only added when env var is set
      ...(minioHost ? [{ protocol: minioProtocol, hostname: minioHost, port: minioPort }] : []),
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// Wrap with Sentry. Source-map upload only runs when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are set (CI/Vercel); otherwise it's a no-op
// passthrough, so local/preview builds without those env vars are unchanged.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- next.config.js is CommonJS
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
})

