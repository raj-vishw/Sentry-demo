import { z } from 'zod';

const urlField = z.string().trim().url('Must be a valid URL.').max(500).nullable().optional();

export const updateSystemConfigSchema = z.object({
  platformName: z.string().trim().min(1, 'Platform name cannot be empty.').max(60).optional(),
  platformDescription: z.string().trim().max(280).optional(),
  registrationEnabled: z.boolean().optional(),
  registrationRequiresApproval: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  logoUrl: urlField,
  faviconUrl: urlField,
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, 'Accent color must be a hex code like #00e5ff.')
    .nullable()
    .optional(),
  bootMessage: z.string().trim().max(120).nullable().optional(),
});

export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>;
