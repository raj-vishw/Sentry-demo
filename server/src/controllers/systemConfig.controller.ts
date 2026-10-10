import type { Request, Response } from 'express';
import * as systemConfigService from '../services/systemConfig.service.js';
import { sendSuccess } from '../utils/response.js';
import type { UpdateSystemConfigInput } from '../validators/systemConfig.schema.js';

export async function getSettings(_req: Request, res: Response) {
  const config = await systemConfigService.getConfig();
  sendSuccess(res, { config });
}

export async function updateSettings(req: Request, res: Response) {
  const config = await systemConfigService.updateConfig(req.user!.sub, req.body as UpdateSystemConfigInput);
  sendSuccess(res, { config });
}
