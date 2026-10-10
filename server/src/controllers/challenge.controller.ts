import type { Request, Response } from 'express';
import path from 'node:path';
import * as challengeService from '../services/challenge.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { UPLOAD_DIR, sanitizeDisplayFilename } from '../config/uploads.js';
import { getParam } from '../utils/params.js';
import type { ListChallengesQuery } from '../validators/challenge.schema.js';

export async function list(req: Request, res: Response) {
  const isAdmin = req.user?.role === 'ADMIN';
  const query = req.query as unknown as ListChallengesQuery;
  const result = await challengeService.listChallenges({
    userId: req.user?.sub,
    includeUnpublished: isAdmin,
    ...query,
  });
  sendSuccess(res, result);
}

export async function getBySlug(req: Request, res: Response) {
  const challenge = await challengeService.getChallengeBySlug(getParam(req, 'slug'), {
    userId: req.user?.sub,
    isAdmin: req.user?.role === 'ADMIN',
  });
  sendSuccess(res, { challenge });
}

export async function getByIdAdmin(req: Request, res: Response) {
  const challenge = await challengeService.getChallengeByIdForAdmin(getParam(req, 'id'));
  sendSuccess(res, { challenge });
}

export async function create(req: Request, res: Response) {
  const challenge = await challengeService.createChallenge(req.user!.sub, req.body);
  sendSuccess(res, { challenge }, 201);
}

export async function update(req: Request, res: Response) {
  const challenge = await challengeService.updateChallenge(req.user!.sub, getParam(req, 'id'), req.body);
  sendSuccess(res, { challenge });
}

export async function remove(req: Request, res: Response) {
  await challengeService.deleteChallenge(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}

export async function publish(req: Request, res: Response) {
  const challenge = await challengeService.setPublished(req.user!.sub, getParam(req, 'id'), true);
  sendSuccess(res, { challenge });
}

export async function unpublish(req: Request, res: Response) {
  const challenge = await challengeService.setPublished(req.user!.sub, getParam(req, 'id'), false);
  sendSuccess(res, { challenge });
}

export async function archive(req: Request, res: Response) {
  const challenge = await challengeService.archiveChallenge(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { challenge });
}

export async function restore(req: Request, res: Response) {
  const challenge = await challengeService.restoreChallengeToDraft(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { challenge });
}

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) throw AppError.validation('No file uploaded.');
  const file = await challengeService.addChallengeFile(getParam(req, 'id'), {
    filename: sanitizeDisplayFilename(req.file.originalname),
    storageKey: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
  sendSuccess(res, { file }, 201);
}

export async function downloadFile(req: Request, res: Response) {
  const file = await challengeService.getChallengeFile(getParam(req, 'id'), getParam(req, 'fileId'), {
    isAdmin: req.user?.role === 'ADMIN',
  });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(path.join(UPLOAD_DIR, path.basename(file.storageKey)), file.filename);
}

export async function unlockHint(req: Request, res: Response) {
  const result = await challengeService.unlockHint(req.user!.sub, getParam(req, 'id'), getParam(req, 'hintId'), {
    isAdmin: req.user!.role === 'ADMIN',
  });
  sendSuccess(res, result);
}
