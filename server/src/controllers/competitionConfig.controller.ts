import type { Request, Response } from 'express';
import * as competitionConfigService from '../services/competitionConfig.service.js';
import { sendSuccess } from '../utils/response.js';
import type { UpdateCompetitionConfigInput } from '../validators/competitionConfig.schema.js';

export async function getSettings(_req: Request, res: Response) {
  const config = await competitionConfigService.getCompetitionConfig();
  sendSuccess(res, { config });
}

export async function updateSettings(req: Request, res: Response) {
  const config = await competitionConfigService.updateCompetitionConfig(
    req.user!.sub,
    req.body as UpdateCompetitionConfigInput,
  );
  sendSuccess(res, { config });
}
