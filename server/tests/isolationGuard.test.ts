import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('isolationGuard', () => {
  let ctx: TestContext;
  let checkSafeToModifyDatabase: () => { safe: boolean; reason?: string };
  let env: { MONGODB_URI: string };

  beforeAll(async () => {
    ctx = await createTestContext();
    ({ checkSafeToModifyDatabase } = await import('../src/config/isolationGuard.js'));
    ({ env } = await import('../src/config/env.js'));
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('passes when the URI is a plain test URI and the confirmation var is exactly correct', () => {
    process.env.DEMO_DB_CONFIRMATION = 'yes-this-is-the-demo-database';
    expect(checkSafeToModifyDatabase()).toEqual({ safe: true });
  });

  it('fails when DEMO_DB_CONFIRMATION is unset', () => {
    delete process.env.DEMO_DB_CONFIRMATION;
    const result = checkSafeToModifyDatabase();
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/DEMO_DB_CONFIRMATION/);
  });

  it('fails when DEMO_DB_CONFIRMATION is set to the wrong value', () => {
    process.env.DEMO_DB_CONFIRMATION = 'close-but-not-it';
    expect(checkSafeToModifyDatabase().safe).toBe(false);
  });

  it('fails when MONGODB_URI matches the main repo\'s specific production cluster, even with a correct confirmation var', () => {
    process.env.DEMO_DB_CONFIRMATION = 'yes-this-is-the-demo-database';
    const original = env.MONGODB_URI;
    env.MONGODB_URI = 'mongodb+srv://user:pass@cluster0.qvnxsi2.mongodb.net/prod';
    const result = checkSafeToModifyDatabase();
    env.MONGODB_URI = original;
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/denylisted/);
  });

  it('allows a different, dedicated Atlas/mongodb+srv cluster — the protocol itself is not denylisted', () => {
    process.env.DEMO_DB_CONFIRMATION = 'yes-this-is-the-demo-database';
    const original = env.MONGODB_URI;
    env.MONGODB_URI = 'mongodb+srv://demo-user:demo-pass@some-other-cluster.mongodb.net/sentry-demo';
    const result = checkSafeToModifyDatabase();
    env.MONGODB_URI = original;
    expect(result.safe).toBe(true);
  });

  it('passes again once the confirmation var is restored and the URI is back to normal', () => {
    process.env.DEMO_DB_CONFIRMATION = 'yes-this-is-the-demo-database';
    expect(checkSafeToModifyDatabase().safe).toBe(true);
  });
});
