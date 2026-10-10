import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

// sentry-demo ships exactly one doc (docs/about-this-demo.md) — see
// src/services/docs.service.ts's DOC_GROUPS — unlike the main Sentry
// repo's full docs/ tree this suite was originally written against.
describe('Public docs browser', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lists docs grouped into sections', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs');
    expect(res.status).toBe(200);
    expect(res.body.data.groups.length).toBeGreaterThan(0);
    const allSlugs = res.body.data.groups.flatMap((g: { items: { slug: string }[] }) => g.items.map((i) => i.slug));
    expect(allSlugs).toContain('about-this-demo');
  });

  it('serves the known doc by slug with real content', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs/about-this-demo');
    expect(res.status).toBe(200);
    expect(res.body.data.doc.slug).toBe('about-this-demo');
    expect(res.body.data.doc.title).toBe('About This Demo');
    expect(res.body.data.doc.content.length).toBeGreaterThan(0);
  });

  it('strips the leading H1 — the page already renders doc.title as its heading', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs/about-this-demo');
    expect(res.status).toBe(200);
    expect(res.body.data.doc.content.trim().startsWith('#')).toBe(false);
  });

  it('never ships a link the in-app browser cannot open: the doc page is free of raw .md link targets', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs');
    const allSlugs: string[] = res.body.data.groups.flatMap((g: { items: { slug: string }[] }) => g.items.map((i) => i.slug));
    for (const slug of allSlugs) {
      const docRes = await request(ctx.app).get(`/api/v1/public/docs/${slug}`);
      expect(docRes.body.data.doc.content).not.toMatch(/\]\([^)]*\.md[^)]*\)/);
    }
  });

  it('404s for an unknown slug — never attempts a filesystem lookup with it', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs/../../../../etc/passwd');
    expect(res.status).toBe(404);
  });

  it('404s for a slug that is well-formed but simply not in the allowlist', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs/not-a-real-page');
    expect(res.status).toBe(404);
  });

  it('404s for a slug from the main Sentry repo that is deliberately not shipped here', async () => {
    const res = await request(ctx.app).get('/api/v1/public/docs/getting-started');
    expect(res.status).toBe(404);
  });
});
