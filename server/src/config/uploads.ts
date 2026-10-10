import multer from 'multer';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — challenge archives/binaries

mkdirSync(UPLOAD_DIR, { recursive: true });

// CTF challenge files legitimately include arbitrary binaries (ELF/PE for
// pwn & reverse-engineering challenges) — those are never executed by this
// server, only stored and served as opaque downloads, so they are not
// blocked here. What IS blocked are types that browsers may render/execute
// if ever served inline, which we guard against defense-in-depth even
// though downloads are always sent as attachments.
const BLOCKED_MIME_TYPES = new Set(['text/html', 'image/svg+xml', 'application/xhtml+xml']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // The on-disk name is fully server-generated — the client-supplied
    // filename is never used as (or to build) a filesystem path, which is
    // what actually prevents path traversal here.
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_MIME_TYPES.has(file.mimetype)) {
      cb(AppError.validation(`File type "${file.mimetype}" is not allowed.`));
      return;
    }
    cb(null, true);
  },
});

export function sanitizeDisplayFilename(original: string): string {
  const base = path.basename(original);
  return base.replace(/[^\w.\- ]/g, '_').slice(0, 150) || 'file';
}
