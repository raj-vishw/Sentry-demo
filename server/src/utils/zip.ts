import yauzl, { type Entry, type ZipFile } from 'yauzl';
import { ZipArchive, type Archiver } from 'archiver';

export interface ZipEntryMeta {
  fileName: string;
  uncompressedSize: number;
  isDirectory: boolean;
  isSymlink: boolean;
}

// Unix file-permission bits live in the upper 16 bits of
// `externalFileAttributes`; a symlink's file-type nibble (S_IFMT) equals
// S_IFLNK (0xA000). Zips built on Windows/without Unix attributes report
// 0 here, which correctly never matches.
function isSymlinkEntry(entry: Entry): boolean {
  const unixMode = entry.externalFileAttributes >>> 16;
  return (unixMode & 0xf000) === 0xa000;
}

function openZip(buffer: Buffer): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) reject(err ?? new Error('Could not open archive.'));
      else resolve(zipfile);
    });
  });
}

/**
 * Metadata for every entry — name and declared uncompressed size are read
 * from the central directory without decompressing anything, which is
 * what makes it possible to reject an oversized/zip-bomb-shaped archive
 * before any real extraction work happens.
 */
export async function listZipEntries(buffer: Buffer): Promise<ZipEntryMeta[]> {
  const zipfile = await openZip(buffer);
  const entries: ZipEntryMeta[] = [];
  return new Promise((resolve, reject) => {
    zipfile.on('entry', (entry: Entry) => {
      entries.push({
        fileName: entry.fileName,
        uncompressedSize: entry.uncompressedSize,
        isDirectory: /\/$/.test(entry.fileName),
        isSymlink: isSymlinkEntry(entry),
      });
      zipfile.readEntry();
    });
    zipfile.on('end', () => resolve(entries));
    zipfile.on('error', reject);
    zipfile.readEntry();
  });
}

/**
 * Opens a fresh pass over the archive and decompresses only the entries
 * `predicate` accepts — every other entry is skipped without ever calling
 * `openReadStream`. Reused for both "just read challenge.yml to validate
 * it" and "now extract the whitelisted files/ entries," so only data that
 * has already been named by a validated manifest is ever decompressed.
 */
export async function extractMatchingEntries(
  buffer: Buffer,
  predicate: (fileName: string) => boolean,
): Promise<Map<string, Buffer>> {
  const zipfile = await openZip(buffer);
  const result = new Map<string, Buffer>();
  return new Promise((resolve, reject) => {
    zipfile.on('entry', (entry: Entry) => {
      if (/\/$/.test(entry.fileName) || !predicate(entry.fileName)) {
        zipfile.readEntry();
        return;
      }
      zipfile.openReadStream(entry, (err, stream) => {
        if (err || !stream) {
          reject(err ?? new Error('Could not read archive entry.'));
          return;
        }
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
          result.set(entry.fileName, Buffer.concat(chunks));
          zipfile.readEntry();
        });
      });
    });
    zipfile.on('end', () => resolve(result));
    zipfile.on('error', reject);
    zipfile.readEntry();
  });
}

/**
 * Builds a zip entirely in memory (archives this small — capped well
 * under what export ever produces — don't need streaming to disk).
 */
export async function buildZipBuffer(append: (archive: Archiver) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    append(archive);
    void archive.finalize();
  });
}
