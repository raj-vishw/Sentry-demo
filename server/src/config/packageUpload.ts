import multer from 'multer';
import { AppError } from '../utils/errors.js';

// Deliberately memory storage, not disk — a challenge package must pass
// full validation (manifest schema, path/size/zip-bomb checks — see
// services/challengePackage.service.ts) before any of it is trusted
// enough to touch permanent storage. 50MB is the archive itself; the
// service layer separately caps the *extracted* size, which is the real
// zip-bomb defense.
const MAX_PACKAGE_ARCHIVE_BYTES = 50 * 1024 * 1024;

export const packageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PACKAGE_ARCHIVE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
      cb(AppError.validation('Only .zip archives are accepted.'));
      return;
    }
    cb(null, true);
  },
});
