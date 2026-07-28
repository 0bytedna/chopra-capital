import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  poweredByHeader: false,
  // Prisma's generated fallback lookup is dynamic and otherwise makes the
  // file tracer include the entire repository (including private runtime data).
  outputFileTracingExcludes: {
    "/*": [
      "./src/**/*",
      "./public/**/*",
      "./prisma/**/*",
      "./scripts/**/*",
      "./uploads/**/*",
      "./.git/**/*",
      "./.env*",
      "./*.log",
      "./README.md",
      "./TODO.md",
      "./AGENTS.md",
      "./CLAUDE.md",
      "./eslint.config.mjs",
      "./postcss.config.mjs",
      "./prisma.config.ts",
      "./next.config.ts",
      "./tsconfig.json",
    ],
  },
  outputFileTracingIncludes: {
    "/*": [
      "./src/generated/prisma/**/*query_engine*.node",
      "./src/generated/prisma/schema.prisma",
      "./src/generated/prisma/package.json",
    ],
  },
  reactStrictMode: true,
  compress: true,
  experimental: {
    serverActions: {
      // Ticket replies may include attachments. Application validation limits
      // submissions to 40 MB; this is only the transport ceiling.
      bodySizeLimit: "42mb",
    },
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;