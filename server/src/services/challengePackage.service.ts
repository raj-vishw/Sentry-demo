import path from 'node:path';
import YAML from 'yaml';
import { Challenge } from '../models/Challenge.js';
import { Hint } from '../models/Hint.js';
import { AppError } from '../utils/errors.js';
import { hashFlag } from '../utils/flag.js';
import { listZipEntries, extractMatchingEntries, buildZipBuffer, type ZipEntryMeta } from '../utils/zip.js';
import { storageProvider } from './storage/LocalStorageProvider.js';
import { generateUniqueSlug, getChallengeByIdForAdmin } from './challenge.service.js';
import { record as recordAudit } from './auditLog.service.js';
import { challengePackageManifestSchema, type ChallengePackageManifest } from '../validators/challengePackage.schema.js';

// Generous enough for any legitimate challenge package, nowhere near
// enough to be a meaningful DoS vector on a self-hosted instance.
export const MAX_PACKAGE_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const MAX_PACKAGE_EXTRACTED_BYTES = 200 * 1024 * 1024;
export const MAX_PACKAGE_FILE_COUNT = 200;
const MAX_FILENAME_LENGTH = 255;
const MANIFEST_ENTRY_NAME = 'challenge.yml';

function assertSafeEntry(entry: ZipEntryMeta): void {
  if (entry.isSymlink) {
    throw AppError.validation(`Archive entry "${entry.fileName}" is a symlink, which is not allowed.`);
  }
  if (entry.fileName.length > MAX_FILENAME_LENGTH) {
    throw AppError.validation(`Archive entry name is too long: "${entry.fileName.slice(0, 40)}...".`);
  }
  if (path.posix.isAbsolute(entry.fileName)) {
    throw AppError.validation(`Archive entry "${entry.fileName}" has an absolute path, which is not allowed.`);
  }
  const normalized = path.posix.normalize(entry.fileName);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw AppError.validation(`Archive entry "${entry.fileName}" attempts to escape the archive root.`);
  }
}

/**
 * Metadata-only validation (count, path safety, symlinks, duplicates, and
 * — critically — the zip-bomb defense: a running total of each entry's
 * *declared* uncompressed size, rejected once it exceeds the cap, all
 * before a single byte of any entry has been decompressed) over every
 * real (non-directory) entry in the archive.
 */
export function validateEntries(entries: ZipEntryMeta[]): ZipEntryMeta[] {
  const realEntries = entries.filter((e) => !e.isDirectory);
  if (realEntries.length > MAX_PACKAGE_FILE_COUNT) {
    throw AppError.validation(`Archive contains too many files (max ${MAX_PACKAGE_FILE_COUNT}).`);
  }

  const seen = new Set<string>();
  let totalSize = 0;
  for (const entry of realEntries) {
    assertSafeEntry(entry);

    const key = path.posix.normalize(entry.fileName).toLowerCase();
    if (seen.has(key)) {
      throw AppError.validation(`Archive contains a duplicate path: "${entry.fileName}".`);
    }
    seen.add(key);

    totalSize += entry.uncompressedSize;
    if (totalSize > MAX_PACKAGE_EXTRACTED_BYTES) {
      throw AppError.validation('Archive is too large once extracted.');
    }
  }

  return realEntries;
}

async function parseManifest(buffer: Buffer): Promise<ChallengePackageManifest> {
  const extracted = await extractMatchingEntries(buffer, (name) => name === MANIFEST_ENTRY_NAME);
  const manifestBytes = extracted.get(MANIFEST_ENTRY_NAME);
  if (!manifestBytes) {
    throw AppError.validation(`Archive is missing a root-level ${MANIFEST_ENTRY_NAME}.`);
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(manifestBytes.toString('utf8'));
  } catch {
    throw AppError.validation(`${MANIFEST_ENTRY_NAME} is not valid YAML.`);
  }

  const result = challengePackageManifestSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    throw AppError.validation('Challenge package manifest is invalid.', details);
  }
  return result.data;
}

/**
 * Every file the manifest references under `files/` must exist in the
 * archive, and every real entry under `files/` must be referenced by the
 * manifest — strict equality in both directions, so the package can't
 * smuggle in an unreferenced file or claim one that isn't actually there.
 */
function crossCheckFiles(manifest: ChallengePackageManifest, entries: ZipEntryMeta[]): void {
  const archiveFilePaths = new Set(
    entries.filter((e) => e.fileName.startsWith('files/')).map((e) => path.posix.normalize(e.fileName)),
  );
  const manifestFilePaths = new Set(manifest.files.map((f) => path.posix.normalize(f)));

  for (const expected of manifestFilePaths) {
    if (!archiveFilePaths.has(expected)) {
      throw AppError.validation(`Manifest references "${expected}" but it is not present in the archive.`);
    }
  }
  for (const present of archiveFilePaths) {
    if (!manifestFilePaths.has(present)) {
      throw AppError.validation(`Archive contains "${present}", which the manifest does not reference.`);
    }
  }
}

export async function importChallenge(adminId: string, archiveBuffer: Buffer, flagPlain: string) {
  if (archiveBuffer.length > MAX_PACKAGE_ARCHIVE_BYTES) {
    throw AppError.payloadTooLarge(
      `Package archive is too large (max ${Math.floor(MAX_PACKAGE_ARCHIVE_BYTES / (1024 * 1024))}MB).`,
    );
  }

  const entries = await listZipEntries(archiveBuffer);
  const realEntries = validateEntries(entries);
  const manifest = await parseManifest(archiveBuffer);
  crossCheckFiles(manifest, realEntries);

  const whitelistedFileNames = new Set(manifest.files.map((f) => path.posix.normalize(f)));
  const fileBuffers = await extractMatchingEntries(archiveBuffer, (name) =>
    whitelistedFileNames.has(path.posix.normalize(name)),
  );

  const uploaded = await Promise.all(
    manifest.files.map(async (manifestPath) => {
      const buf = fileBuffers.get(manifestPath);
      if (!buf) throw AppError.validation(`Could not read "${manifestPath}" from the archive.`);
      const filename = path.posix.basename(manifestPath);
      const meta = await storageProvider.upload(buf, { filename });
      return { filename, storageKey: meta.storageKey, size: meta.size, mimeType: 'application/octet-stream' };
    }),
  );

  const slug = await generateUniqueSlug(manifest.challenge.slug || manifest.challenge.title);
  const flagHash = await hashFlag(flagPlain);

  const doc = await Challenge.create({
    title: manifest.challenge.title,
    slug,
    description: manifest.challenge.description,
    shortDescription: manifest.challenge.shortDescription,
    tags: manifest.challenge.tags,
    category: manifest.challenge.category,
    type: manifest.challenge.type,
    difficulty: manifest.challenge.difficulty,
    points: manifest.challenge.points,
    flagHash,
    flagFormat: manifest.flag.format,
    status: 'DRAFT', // always — an import is never auto-published, regardless of the manifest.
    author: adminId,
    originalAuthor: manifest.challenge.originalAuthor ?? null,
    files: uploaded,
    environment: manifest.environment
      ? {
          runtime: 'DOCKER',
          port: manifest.environment.port ?? null,
          protocol: manifest.environment.protocol,
          cpuLimit: manifest.environment.cpuLimit,
          memoryLimitMb: manifest.environment.memoryLimitMb,
          timeoutSeconds: manifest.environment.timeoutSeconds,
        }
      : null,
  });

  if (manifest.hints.length > 0) {
    await Hint.insertMany(manifest.hints.map((h) => ({ ...h, challenge: doc._id })));
  }

  await recordAudit(adminId, 'ADMIN', 'ADMIN_IMPORTED_CHALLENGE', 'challenge', doc.id, {
    slug: doc.slug,
    title: doc.title,
    type: doc.type,
    fileCount: uploaded.length,
  });

  return getChallengeByIdForAdmin(doc.id);
}

export async function exportChallenge(adminId: string, id: string): Promise<{ filename: string; buffer: Buffer }> {
  const doc = await Challenge.findById(id).populate('author', 'username');
  if (!doc) throw AppError.notFound('Challenge not found.');
  const author = doc.author as unknown as { username: string } | null;
  const hints = await Hint.find({ challenge: doc._id }).sort({ order: 1 });

  const fileBuffers = await Promise.all(doc.files.map((f) => storageProvider.download(f.storageKey)));

  const manifest: ChallengePackageManifest = {
    schemaVersion: 1,
    challenge: {
      slug: doc.slug,
      title: doc.title,
      shortDescription: doc.shortDescription,
      description: doc.description,
      category: doc.category as ChallengePackageManifest['challenge']['category'],
      type: doc.type as ChallengePackageManifest['challenge']['type'],
      difficulty: doc.difficulty as ChallengePackageManifest['challenge']['difficulty'],
      points: doc.points,
      tags: doc.tags,
      originalAuthor: doc.originalAuthor ?? author?.username ?? null,
    },
    // Never a flag value — see validators/challengePackage.schema.ts's
    // comment on why that field doesn't exist at all.
    flag: { format: doc.flagFormat },
    hints: hints.map((h) => ({ title: h.title, cost: h.cost, content: h.content, order: h.order })),
    files: doc.files.map((f) => `files/${f.filename}`),
    environment: doc.environment
      ? {
          runtime: 'docker' as const,
          port: doc.environment.port ?? null,
          protocol: doc.environment.protocol as 'HTTP' | 'TCP' | 'UDP',
          cpuLimit: doc.environment.cpuLimit,
          memoryLimitMb: doc.environment.memoryLimitMb,
          timeoutSeconds: doc.environment.timeoutSeconds,
        }
      : null,
  };

  const yamlText = YAML.stringify(manifest);
  const buffer = await buildZipBuffer((archive) => {
    archive.append(yamlText, { name: MANIFEST_ENTRY_NAME });
    archive.append(
      `# ${doc.title}\n\nExported from Sentry. See docs/challenges/challenge-packages.md for the manifest format.\n`,
      { name: 'README.md' },
    );
    doc.files.forEach((f, i) => {
      archive.append(fileBuffers[i], { name: `files/${f.filename}` });
    });
  });

  await recordAudit(adminId, 'ADMIN', 'ADMIN_EXPORTED_CHALLENGE', 'challenge', doc.id, { slug: doc.slug });

  return { filename: `${doc.slug}.zip`, buffer };
}
