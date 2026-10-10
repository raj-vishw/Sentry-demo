import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

export interface TestContext {
  app: Express;
  teardown: () => Promise<void>;
}

/**
 * Boots an isolated in-memory MongoDB instance and a fresh copy of the
 * Express app pointed at it. Env vars are set before the first (dynamic)
 * import of anything under src/, since env.ts validates and freezes them
 * at import time.
 */
export async function createTestContext(): Promise<TestContext> {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '4099';
  process.env.JWT_SECRET = 'test-access-secret-not-for-production-use-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-use-only';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.CLIENT_URL = 'http://localhost:5173';
  // Explicitly pinned to the Zod default so a developer's real server/.env
  // value (meant for actual dev use) never leaks into the test suite —
  // every test file's hardcoded `/api/v1/admin/...` calls depend on this.
  // adminRoutePrefix.test.ts is the one file that deliberately overrides
  // this itself, before calling createTestContext().
  process.env.ADMIN_ROUTE_PREFIX ??= 'admin';
  // Empty-string sentinel = "use the default" (see env.ts) — resolves to
  // the real repo-root docs/ folder since tests run with cwd = server/,
  // exactly like bare-metal dev. publicDocs.test.ts reads real doc content
  // through this, which is deliberate (confirms the real docs are served).
  process.env.DOCS_DIR ??= '';

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connectDatabase, disconnectDatabase } = await import('../../src/config/database.js');
  await connectDatabase();
  const { createApp } = await import('../../src/app.js');
  const app = createApp();

  return {
    app,
    teardown: async () => {
      await disconnectDatabase();
      await mongod.stop();
    },
  };
}
