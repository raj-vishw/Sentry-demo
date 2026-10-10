import {
  CompetitionConfig,
  COMPETITION_CONFIG_ID,
  type CompetitionConfigDoc,
  type LeaderboardVisibility,
} from '../models/CompetitionConfig.js';
import { record as recordAudit } from './auditLog.service.js';

export interface CompetitionConfigDto {
  name: string;
  description: string;
  rules: string;
  startTime: Date | null;
  endTime: Date | null;
  freezeTime: Date | null;
  leaderboardVisibility: LeaderboardVisibility;
}

function toDto(doc: CompetitionConfigDoc): CompetitionConfigDto {
  return {
    name: doc.name,
    description: doc.description,
    rules: doc.rules,
    startTime: doc.startTime ?? null,
    endTime: doc.endTime ?? null,
    freezeTime: doc.freezeTime ?? null,
    leaderboardVisibility: doc.leaderboardVisibility as LeaderboardVisibility,
  };
}

export async function getCompetitionConfigDoc(): Promise<CompetitionConfigDoc> {
  const doc = await CompetitionConfig.findByIdAndUpdate(
    COMPETITION_CONFIG_ID,
    { $setOnInsert: { _id: COMPETITION_CONFIG_ID } },
    { upsert: true, returnDocument: 'after' },
  );
  return doc!;
}

export async function getCompetitionConfig(): Promise<CompetitionConfigDto> {
  return toDto(await getCompetitionConfigDoc());
}

export interface UpdateCompetitionConfigInput {
  name?: string;
  description?: string;
  rules?: string;
  startTime?: Date | null;
  endTime?: Date | null;
  freezeTime?: Date | null;
  leaderboardVisibility?: LeaderboardVisibility;
}

export async function updateCompetitionConfig(
  adminId: string,
  input: UpdateCompetitionConfigInput,
): Promise<CompetitionConfigDto> {
  const doc = await CompetitionConfig.findByIdAndUpdate(
    COMPETITION_CONFIG_ID,
    { $set: input, $setOnInsert: { _id: COMPETITION_CONFIG_ID } },
    { upsert: true, returnDocument: 'after' },
  );
  await recordAudit(adminId, 'ADMIN', 'ADMIN_UPDATED_COMPETITION_CONFIG', 'competition_config', COMPETITION_CONFIG_ID, {
    ...input,
  });
  return toDto(doc!);
}
