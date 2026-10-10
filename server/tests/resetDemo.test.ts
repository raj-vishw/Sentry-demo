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

describe('demo reset', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    setDemoEnv();
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reverts visitor-made changes back to the seeded baseline', async () => {
    const { runSeed } = await import('../src/scripts/seedDemo.js');
    const { Challenge } = await import('../src/models/Challenge.js');
    const { Submission } = await import('../src/models/Submission.js');
    const { User } = await import('../src/models/User.js');
    const { updateConfig, getConfig } = await import('../src/services/systemConfig.service.js');

    await runSeed();

    const challenge = await Challenge.findOne().lean();
    if (!challenge) throw new Error('expected at least one seeded challenge');
    const originalPoints = challenge.points;

    const anyUser = await User.findOne().lean();
    if (!anyUser) throw new Error('expected at least one seeded user');

    // Mutate state the way a real visitor/admin would during the demo.
    await Challenge.updateOne({ _id: challenge._id }, { points: originalPoints + 1000 });
    await Submission.create({
      user: anyUser._id,
      challenge: challenge._id,
      submittedFlagHash: 'deadbeef',
      correct: true,
      pointsAwarded: 999,
      ip: '127.0.0.1',
    });
    await updateConfig(String(anyUser._id), { maintenanceMode: true });
    expect((await getConfig()).maintenanceMode).toBe(true);

    await runSeed();

    const revertedChallenge = await Challenge.findOne({ title: challenge.title }).lean();
    expect(revertedChallenge?.points).toBe(originalPoints);
    expect(await Submission.countDocuments()).toBe(0);
    expect((await getConfig()).maintenanceMode).toBe(false);
  });

  it('the isolation guard is actually consulted — refuses when DEMO_DB_CONFIRMATION is unset', async () => {
    const { checkSafeToModifyDatabase } = await import('../src/config/isolationGuard.js');
    const original = process.env.DEMO_DB_CONFIRMATION;
    delete process.env.DEMO_DB_CONFIRMATION;
    expect(checkSafeToModifyDatabase().safe).toBe(false);
    process.env.DEMO_DB_CONFIRMATION = original;
  });
});
