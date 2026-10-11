import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { extractMatchingEntries, buildZipBuffer } from '../src/utils/zip.js';

// Pure logic (no real archive needed) — fabricates ZipEntryMeta arrays
// directly so the zip-bomb/path-traversal/duplicate/count defenses are
// testable deterministically, without needing to construct a genuinely
// 200MB archive or a real symlink inside a zip.
describe('Challenge package entry validation (pure logic)', () => {
  let ctx: TestContext;
  let validateEntries: typeof import('../src/services/challengePackage.service.js')['validateEntries'];
  let MAX_PACKAGE_FILE_COUNT: number;
  let MAX_PACKAGE_EXTRACTED_BYTES: number;

  beforeAll(async () => {
    ctx = await createTestContext();
    const mod = await import('../src/services/challengePackage.service.js');
    validateEntries = mod.validateEntries;
    MAX_PACKAGE_FILE_COUNT = mod.MAX_PACKAGE_FILE_COUNT;
    MAX_PACKAGE_EXTRACTED_BYTES = mod.MAX_PACKAGE_EXTRACTED_BYTES;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  function entry(overrides: Partial<{ fileName: string; uncompressedSize: number; isDirectory: boolean; isSymlink: boolean }>) {
    return { fileName: 'files/a.txt', uncompressedSize: 10, isDirectory: false, isSymlink: false, ...overrides };
  }

  it('accepts a normal, small set of entries', () => {
    const result = validateEntries([entry({ fileName: 'challenge.yml' }), entry({ fileName: 'files/a.txt' })]);
    expect(result).toHaveLength(2);
  });

  it('ignores directory entries entirely', () => {
    const result = validateEntries([entry({ fileName: 'files/', isDirectory: true }), entry({ fileName: 'challenge.yml' })]);
    expect(result).toHaveLength(1);
  });

  it('rejects a symlink entry', () => {
    expect(() => validateEntries([entry({ fileName: 'files/evil', isSymlink: true })])).toThrow(/symlink/i);
  });

  it('rejects a path-traversal entry', () => {
    expect(() => validateEntries([entry({ fileName: '../../etc/passwd' })])).toThrow(/escape the archive root/i);
  });

  it('rejects an absolute path entry', () => {
    expect(() => validateEntries([entry({ fileName: '/etc/passwd' })])).toThrow(/absolute path/i);
  });

  it('rejects a duplicate path (case-insensitive)', () => {
    expect(() =>
      validateEntries([entry({ fileName: 'files/A.txt' }), entry({ fileName: 'files/a.txt' })]),
    ).toThrow(/duplicate path/i);
  });

  it('rejects an archive with too many files', () => {
    const entries = Array.from({ length: MAX_PACKAGE_FILE_COUNT + 1 }, (_, i) => entry({ fileName: `files/f${i}.txt` }));
    expect(() => validateEntries(entries)).toThrow(/too many files/i);
  });

  it('rejects once the cumulative declared uncompressed size exceeds the cap (the zip-bomb defense)', () => {
    // Two entries, each individually small, whose declared sizes sum past
    // the cap — this is the exact shape of a zip-bomb-style attack: tiny
    // compressed size, huge declared uncompressed size, caught here before
    // any byte of either entry is ever decompressed.
    const entries = [
      entry({ fileName: 'files/a.bin', uncompressedSize: MAX_PACKAGE_EXTRACTED_BYTES }),
      entry({ fileName: 'files/b.bin', uncompressedSize: 1 }),
    ];
    expect(() => validateEntries(entries)).toThrow(/too large once extracted/i);
  });
});

// `validateEntries`'s zip-bomb check only sums each entry's *declared*
// uncompressedSize from the zip's own central-directory metadata — a value
// the archive itself controls and could misstate. These cover the other
// half of the defense: extractMatchingEntries enforcing a hard cap against
// the actual bytes a stream yields during decompression, independent of
// whatever any entry claimed upfront.
describe('extractMatchingEntries (actual decompressed-byte cap)', () => {
  it('rejects once real decompressed bytes exceed maxTotalBytes, even though declared metadata matches', async () => {
    const buffer = await buildZipBuffer((archive) => {
      archive.append(Buffer.alloc(1000, 'a'), { name: 'files/big.bin' });
    });
    await expect(extractMatchingEntries(buffer, () => true, 500)).rejects.toThrow(/too large once extracted/i);
  });

  it('still extracts normally when within maxTotalBytes', async () => {
    const buffer = await buildZipBuffer((archive) => {
      archive.append(Buffer.from('small content'), { name: 'files/small.txt' });
    });
    const result = await extractMatchingEntries(buffer, () => true, 1_000_000);
    expect(result.get('files/small.txt')?.toString()).toBe('small content');
  });

  it('defaults to no cap when maxTotalBytes is omitted (back-compat)', async () => {
    const buffer = await buildZipBuffer((archive) => {
      archive.append(Buffer.from('content'), { name: 'files/a.txt' });
    });
    const result = await extractMatchingEntries(buffer, () => true);
    expect(result.get('files/a.txt')?.toString()).toBe('content');
  });
});
