import { z } from 'zod';
import { CATEGORY_SLUGS } from '../models/Category.js';
import { DIFFICULTIES, CHALLENGE_TYPES, ENVIRONMENT_PROTOCOLS } from '../models/Challenge.js';

// Only version 1 exists today — the importer rejects anything else
// outright rather than guessing at forward/backward compatibility.
const SUPPORTED_SCHEMA_VERSIONS = [1] as const;

const manifestHintSchema = z.object({
  title: z.string().trim().min(1).max(120),
  cost: z.number().int().min(0).default(0),
  content: z.string().trim().min(1),
  order: z.number().int().min(0).default(0),
});

const manifestEnvironmentSchema = z.object({
  runtime: z.literal('docker').default('docker'),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  protocol: z.enum(ENVIRONMENT_PROTOCOLS).default('HTTP'),
  cpuLimit: z.number().min(0.1).max(16).default(1),
  memoryLimitMb: z.number().int().min(16).max(16384).default(512),
  timeoutSeconds: z.number().int().min(60).max(86400).default(3600),
});

// Deliberately has no `flag.value` field at all — flags are stored as a
// one-way bcrypt hash with the plaintext never retained anywhere (see
// utils/flag.ts), so there is no real secret a manifest could ever
// legitimately carry. Importing a package always requires the admin to
// type the real flag in separately (see challengePackage.service.ts).
export const challengePackageManifestSchema = z
  .object({
    schemaVersion: z
      .number()
      .int()
      .refine((v): v is (typeof SUPPORTED_SCHEMA_VERSIONS)[number] => (SUPPORTED_SCHEMA_VERSIONS as readonly number[]).includes(v), {
        message: `Unsupported schemaVersion. Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
      }),
    challenge: z.object({
      slug: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/i, 'Slug may only contain letters, numbers, and hyphens.'),
      title: z.string().trim().min(3).max(120),
      shortDescription: z.string().trim().max(160).default(''),
      description: z.string().trim().min(10),
      category: z.enum(CATEGORY_SLUGS, { message: 'Unknown category.' }),
      type: z.enum(CHALLENGE_TYPES, { message: 'Unknown challenge type.' }).default('STATIC'),
      difficulty: z.enum(DIFFICULTIES, { message: 'Unknown difficulty.' }),
      points: z.number().int().min(0).max(10000),
      tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
      originalAuthor: z.string().trim().max(60).nullable().optional(),
    }),
    flag: z.object({
      format: z.string().trim().max(60).default('CTF{...}'),
    }),
    hints: z.array(manifestHintSchema).default([]),
    files: z.array(z.string().trim().min(1)).default([]),
    environment: manifestEnvironmentSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const needsEnvironment = data.challenge.type !== 'STATIC';
    if (needsEnvironment && !data.environment) {
      ctx.addIssue({
        code: 'custom',
        message: 'environment is required when challenge.type is INTERACTIVE or HYBRID.',
        path: ['environment'],
      });
    }
    if (!needsEnvironment && data.environment) {
      ctx.addIssue({
        code: 'custom',
        message: 'environment must be omitted when challenge.type is STATIC.',
        path: ['environment'],
      });
    }
  });

export type ChallengePackageManifest = z.infer<typeof challengePackageManifestSchema>;

export const importChallengeFormSchema = z.object({
  // The real flag secret — never present in the manifest itself (see
  // above), always supplied directly by the importing admin.
  flag: z.string().trim().min(3, 'Flag must be at least 3 characters.'),
});

export type ImportChallengeFormInput = z.infer<typeof importChallengeFormSchema>;
