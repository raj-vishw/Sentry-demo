import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

function setDemoEnv() {
  process.env.DEMO_DB_CONFIRMATION = 'yes-this-is-the-demo-database';
  process.env.DEMO_ADMIN_USERNAME = 'demo-admin';
  process.env.DEMO_ADMIN_EMAIL = 'demo-admin@sentry-demo.example';
  process.env.DEMO_ADMIN_PASSWORD = 'SentryDemo!Admin2026';
  process.env.DEMO_USER_USERNAME = 'demo-player';
  process.env.DEMO_USER_EMAIL = 'demo-player@sentry-demo.example';
  process.env.DEMO_USER_PASSWORD = 'SentryDemo!Player2026';
}

describe('seedDemo idempotency', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    setDemoEnv();
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('produces a stable, non-duplicating state across repeated runs', async () => {
    const { runSeed } = await import('../src/scripts/seedDemo.js');
    const { User } = await import('../src/models/User.js');
    const { Category } = await import('../src/models/Category.js');
    const { Challenge } = await import('../src/models/Challenge.js');
    const { Hint } = await import('../src/models/Hint.js');

    await runSeed();

    const usersAfterFirst = await User.countDocuments();
    const categoriesAfterFirst = await Category.countDocuments();
    const challengesAfterFirst = await Challenge.countDocuments();
    const hintsAfterFirst = await Hint.countDocuments();
    const slugsAfterFirst = (await Challenge.find().select('slug').lean()).map((c) => c.slug).sort();

    expect(usersAfterFirst).toBe(2);
    expect(categoriesAfterFirst).toBe(4);
    expect(challengesAfterFirst).toBe(12);
    expect(hintsAfterFirst).toBe(12); // every seeded challenge has exactly one hint

    await runSeed();

    expect(await User.countDocuments()).toBe(usersAfterFirst);
    expect(await Category.countDocuments()).toBe(categoriesAfterFirst);
    expect(await Challenge.countDocuments()).toBe(challengesAfterFirst);
    expect(await Hint.countDocuments()).toBe(hintsAfterFirst);

    const slugsAfterSecond = (await Challenge.find().select('slug').lean()).map((c) => c.slug).sort();
    expect(slugsAfterSecond).toEqual(slugsAfterFirst);

    expect(await User.countDocuments({ email: process.env.DEMO_ADMIN_EMAIL })).toBe(1);
    expect(await User.countDocuments({ email: process.env.DEMO_USER_EMAIL })).toBe(1);
  });
});
