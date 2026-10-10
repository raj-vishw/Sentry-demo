import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import YAML from 'yaml';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

type Archive = import('archiver').Archiver;

async function buildZip(manifest: Record<string, unknown>, files: Record<string, string> = {}): Promise<Buffer> {
  const { buildZipBuffer } = await import('../src/utils/zip.js');
  return buildZipBuffer((archive: Archive) => {
    archive.append(YAML.stringify(manifest), { name: 'challenge.yml' });
    for (const [name, content] of Object.entries(files)) {
      archive.append(content, { name: `files/${name}` });
    }
  });
}

function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    challenge: {
      slug: 'midnight-packet',
      title: 'Midnight Packet',
      description: 'A SOC detected suspicious traffic from an industrial gateway.',
      category: 'forensics',
      type: 'STATIC',
      difficulty: 'MEDIUM',
      points: 300,
      tags: ['pcap', 'dns'],
    },
    flag: { format: 'flag{...}' },
    hints: [{ title: 'First Lead', cost: 25, content: 'Look at the DNS traffic.' }],
    files: ['files/notes.txt'],
    ...overrides,
  };
}

describe('Challenge package import/export', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'package_admin');
    userToken = await registerUser(ctx, 'package_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('imports a valid package as a DRAFT with the admin-supplied flag, never anything from the manifest', async () => {
    const zip = await buildZip(baseManifest(), { 'notes.txt': 'incident notes' });

    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'CTF{real_flag_from_admin}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });

    expect(res.status).toBe(201);
    expect(res.body.data.challenge.status).toBe('DRAFT');
    expect(res.body.data.challenge.title).toBe('Midnight Packet');
    expect(res.body.data.challenge.type).toBe('STATIC');
    expect(res.body.data.challenge.tags).toEqual(['pcap', 'dns']);
    expect(res.body.data.challenge.hints).toHaveLength(1);
    expect(res.body.data.challenge.files).toHaveLength(1);
    // Never the manifest's flag (there is no such field) nor anything else.
    expect(res.body.data.challenge.flag).toBeUndefined();
    expect(res.body.data.challenge.flagHash).toBeUndefined();

    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_IMPORTED_CHALLENGE' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('rejects a weak/missing flag field before touching the archive', async () => {
    const zip = await buildZip(baseManifest(), { 'notes.txt': 'incident notes' });
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'ab')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported schemaVersion', async () => {
    const zip = await buildZip(baseManifest({ schemaVersion: 99 }), { 'notes.txt': 'x' });
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'CTF{whatever}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(400);
  });

  it('rejects a path-traversal entry inside the archive', async () => {
    const { buildZipBuffer } = await import('../src/utils/zip.js');
    const zip = await buildZipBuffer((archive: Archive) => {
      archive.append(YAML.stringify(baseManifest()), { name: 'challenge.yml' });
      archive.append('pwned', { name: '../../etc/passwd' });
    });
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'CTF{whatever}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(400);
  });

  it('rejects a manifest whose files list does not match the archive contents', async () => {
    // Manifest references files/notes.txt, but the archive doesn't contain it.
    const zip = await buildZip(baseManifest(), {});
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'CTF{whatever}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(400);
  });

  it('rejects a manifest requiring an environment for a STATIC challenge type mismatch', async () => {
    const zip = await buildZip(
      baseManifest({
        challenge: { ...baseManifest().challenge, type: 'INTERACTIVE' },
        // No `environment` block even though type is INTERACTIVE.
      }),
      { 'notes.txt': 'x' },
    );
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('flag', 'CTF{whatever}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(400);
  });

  it('rejects import from a non-admin', async () => {
    const zip = await buildZip(baseManifest({ challenge: { ...baseManifest().challenge, slug: 'user-import-attempt' } }), {
      'notes.txt': 'x',
    });
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges/import')
      .set('Authorization', `Bearer ${userToken}`)
      .field('flag', 'CTF{whatever}')
      .attach('archive', zip, { filename: 'package.zip', contentType: 'application/zip' });
    expect(res.status).toBe(403);
  });

  it('exports a challenge as a zip whose manifest never contains a flag value', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Export Me',
        description: 'A challenge created specifically to be exported.',
        category: 'crypto',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{should_never_be_exported}',
        published: false,
      });
    const id = create.body.data.challenge.id;

    const res = await request(ctx.app)
      .get(`/api/v1/admin/challenges/${id}/export`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((parseRes, callback) => {
        const chunks: Buffer[] = [];
        parseRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        parseRes.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('attachment');

    const { extractMatchingEntries } = await import('../src/utils/zip.js');
    const extracted = await extractMatchingEntries(res.body as Buffer, (name) => name === 'challenge.yml');
    const manifestText = extracted.get('challenge.yml')!.toString('utf8');
    expect(manifestText).not.toContain('should_never_be_exported');
    const manifest = YAML.parse(manifestText);
    expect(manifest.flag).toEqual({ format: 'CTF{...}' });
    expect(manifest.flag.value).toBeUndefined();
  });

  it('rejects export from a non-admin', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Export Denied',
        description: 'Only an admin may export this.',
        category: 'crypto',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{denied}',
        published: false,
      });
    const id = create.body.data.challenge.id;

    const res = await request(ctx.app)
      .get(`/api/v1/admin/challenges/${id}/export`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
