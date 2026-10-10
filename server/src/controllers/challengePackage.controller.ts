import type { Request, Response } from 'express';
import * as challengePackageService from '../services/challengePackage.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { getParam } from '../utils/params.js';
import type { ImportChallengeFormInput } from '../validators/challengePackage.schema.js';

export async function importChallenge(req: Request, res: Response) {
  if (!req.file) throw AppError.validation('No package archive uploaded.');
  const { flag } = req.body as ImportChallengeFormInput;
  const challenge = await challengePackageService.importChallenge(req.user!.sub, req.file.buffer, flag);
  sendSuccess(res, { challenge }, 201);
}

export async function exportChallenge(req: Request, res: Response) {
  const { filename, buffer } = await challengePackageService.exportChallenge(req.user!.sub, getParam(req, 'id'));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}
