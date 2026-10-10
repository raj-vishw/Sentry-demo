import { writeFile, readFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOAD_DIR } from '../../config/uploads.js';
import type { StorageProvider, UploadedFileMeta } from './StorageProvider.js';

/**
 * Wraps the same `UPLOAD_DIR` the existing multer config writes into
 * (config/uploads.ts) — one storage namespace regardless of which code
 * path wrote a given file. The on-disk name is always server-generated,
 * exactly like the existing upload route: the caller's filename is never
 * used as, or to build, a filesystem path, which is what actually
 * prevents path traversal here.
 */
export class LocalStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, opts: { filename: string }): Promise<UploadedFileMeta> {
    const ext = path.extname(opts.filename).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const storageKey = `${randomUUID()}${ext}`;
    await writeFile(path.join(UPLOAD_DIR, storageKey), buffer);
    return { storageKey, size: buffer.length };
  }

  async download(storageKey: string): Promise<Buffer> {
    return readFile(path.join(UPLOAD_DIR, path.basename(storageKey)));
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(path.join(UPLOAD_DIR, path.basename(storageKey))).catch(() => {
      // Already missing — nothing to clean up.
    });
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await access(path.join(UPLOAD_DIR, path.basename(storageKey)));
      return true;
    } catch {
      return false;
    }
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
