export interface UploadedFileMeta {
  storageKey: string;
  size: number;
}

/**
 * Introduced for, and currently only used by, the challenge package
 * import/export pathway (services/challengePackage.service.ts) — the one
 * place that needs to programmatically write/read several files at once,
 * unlike the existing single-file admin upload route
 * (`POST /admin/challenges/:id/files`), which already works via multer's
 * disk storage directly and is left untouched (see config/uploads.ts).
 *
 * `LocalStorageProvider` is the only implementation today. Designed so a
 * future S3/MinIO implementation can be swapped in without the import/
 * export code changing — not built now because there is no second real
 * backend to justify it yet.
 */
export interface StorageProvider {
  upload(buffer: Buffer, opts: { filename: string }): Promise<UploadedFileMeta>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
