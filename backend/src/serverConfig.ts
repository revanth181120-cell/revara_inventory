import { CorsOptions } from 'cors';

const DEFAULT_API_HOST = '127.0.0.1';

const DEFAULT_ALLOWED_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export function resolveApiHost(env: NodeJS.ProcessEnv = process.env): string {
  return env.HOST?.trim() || env.API_HOST?.trim() || DEFAULT_API_HOST;
}

export function parseAllowedCorsOrigins(rawOrigins: string | undefined = process.env.CORS_ORIGIN): Set<string> {
  const configured = rawOrigins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_ALLOWED_CORS_ORIGINS);
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: Set<string> = parseAllowedCorsOrigins(),
): boolean {
  return !origin || allowedOrigins.has(origin);
}

export function buildCorsOptions(allowedOrigins: Set<string> = parseAllowedCorsOrigins()): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, isCorsOriginAllowed(origin, allowedOrigins));
    },
  };
}
