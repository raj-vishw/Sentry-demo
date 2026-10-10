#!/usr/bin/env node
// Human-runnable smoke check — hits the backend's health endpoints and
// exits non-zero on failure. Separate from the Docker Compose healthcheck
// blocks (those use an inline `node -e` one-liner so the image needs no
// extra file); this one is for a person verifying a running deployment.
//
// Usage: node scripts/healthcheck.mjs http://localhost:4001

const baseUrl = process.argv[2] ?? 'http://localhost:4001';

async function check(path) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${url} returned ${res.status}: ${JSON.stringify(body)}`);
  }
  console.log(`OK  ${url} ->`, JSON.stringify(body));
}

try {
  await check('/api/health/live');
  await check('/api/health/ready');
  console.log('Healthcheck passed.');
  process.exit(0);
} catch (err) {
  console.error('Healthcheck failed:', err.message);
  process.exit(1);
}
