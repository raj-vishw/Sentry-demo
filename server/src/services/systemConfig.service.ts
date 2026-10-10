import { SystemConfig, SYSTEM_CONFIG_ID, type SystemConfigDoc } from '../models/SystemConfig.js';
import { record as recordAudit } from './auditLog.service.js';

export interface SystemConfigDto {
  platformName: string;
  platformDescription: string;
  registrationEnabled: boolean;
  registrationRequiresApproval: boolean;
  maintenanceMode: boolean;
  setupCompleted: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  bootMessage: string | null;
}

function toDto(doc: SystemConfigDoc): SystemConfigDto {
  return {
    platformName: doc.platformName,
    platformDescription: doc.platformDescription,
    registrationEnabled: doc.registrationEnabled,
    registrationRequiresApproval: doc.registrationRequiresApproval,
    maintenanceMode: doc.maintenanceMode,
    setupCompleted: doc.setupCompleted,
    logoUrl: doc.logoUrl ?? null,
    faviconUrl: doc.faviconUrl ?? null,
    accentColor: doc.accentColor ?? null,
    bootMessage: doc.bootMessage ?? null,
  };
}

/**
 * Lazily creates the singleton config doc with defaults on first read —
 * there is nothing to migrate for a fresh install, the defaults themselves
 * are the initial state.
 */
export async function getConfigDoc(): Promise<SystemConfigDoc> {
  const doc = await SystemConfig.findByIdAndUpdate(
    SYSTEM_CONFIG_ID,
    { $setOnInsert: { _id: SYSTEM_CONFIG_ID } },
    { upsert: true, returnDocument: 'after' },
  );
  return doc!;
}

export async function getConfig(): Promise<SystemConfigDto> {
  return toDto(await getConfigDoc());
}

export interface UpdateSystemConfigInput {
  platformName?: string;
  platformDescription?: string;
  registrationEnabled?: boolean;
  registrationRequiresApproval?: boolean;
  maintenanceMode?: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  bootMessage?: string | null;
}

export async function updateConfig(adminId: string, input: UpdateSystemConfigInput): Promise<SystemConfigDto> {
  const doc = await SystemConfig.findByIdAndUpdate(
    SYSTEM_CONFIG_ID,
    { $set: input, $setOnInsert: { _id: SYSTEM_CONFIG_ID } },
    { upsert: true, returnDocument: 'after' },
  );
  await recordAudit(adminId, 'ADMIN', 'ADMIN_UPDATED_SYSTEM_CONFIG', 'system_config', SYSTEM_CONFIG_ID, { ...input });
  return toDto(doc!);
}
