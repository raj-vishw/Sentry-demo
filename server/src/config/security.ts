import type { CorsOptions } from 'cors';
import { env } from './env.js';

const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim());

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header) and any
    // explicitly configured client origin. Never falls back to "*" — this
    // API is used with credentials (cookies), which forbids a wildcard.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

export const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
  // This server only ever returns JSON or a file attachment — it never
  // renders HTML — so the CSP can be maximally strict rather than tuned to
  // a page's script/style sources. This is defense-in-depth: if a future
  // route ever accidentally echoed back HTML (e.g. a misconfigured error
  // page), nothing in it could execute or load externally. The actual
  // frontend (which does render HTML) sets its own CSP at the nginx layer
  // in production — see client/nginx.conf.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
  },
};
