import type { Request, Response } from 'express';
import * as writeupService from '../services/writeup.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';
import type { ListWriteupsQuery, ListAdminWriteupsQuery } from '../validators/writeup.schema.js';

export async function listPublished(req: Request, res: Response) {
  const result = await writeupService.listPublishedWriteups(req.query as unknown as ListWriteupsQuery);
  sendSuccess(res, result);
}

export async function listMine(req: Request, res: Response) {
  const result = await writeupService.listMyWriteups(req.user!.sub);
  sendSuccess(res, result);
}

export async function getBySlug(req: Request, res: Response) {
  const writeup = await writeupService.getWriteupBySlug(getParam(req, 'slug'), {
    userId: req.user?.sub,
    isAdmin: req.user?.role === 'ADMIN',
  });
  sendSuccess(res, { writeup });
}

export async function create(req: Request, res: Response) {
  const writeup = await writeupService.createWriteup(req.user!.sub, req.body);
  sendSuccess(res, { writeup }, 201);
}

export async function update(req: Request, res: Response) {
  const writeup = await writeupService.updateWriteup(req.user!.sub, req.user!.role === 'ADMIN', getParam(req, 'id'), req.body);
  sendSuccess(res, { writeup });
}

export async function submit(req: Request, res: Response) {
  const writeup = await writeupService.submitForReview(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { writeup });
}

export async function remove(req: Request, res: Response) {
  await writeupService.deleteWriteup(req.user!.sub, req.user!.role === 'ADMIN', getParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}

export async function like(req: Request, res: Response) {
  const result = await writeupService.toggleLike(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, result);
}

// --- Admin moderation (mounted under /api/v1/admin/writeups) ---

export async function listForAdmin(req: Request, res: Response) {
  const result = await writeupService.listForAdmin(req.query as unknown as ListAdminWriteupsQuery);
  sendSuccess(res, result);
}

export async function getByIdAdmin(req: Request, res: Response) {
  const writeup = await writeupService.getWriteupByIdForAdmin(getParam(req, 'id'));
  sendSuccess(res, { writeup });
}

export async function approve(req: Request, res: Response) {
  const writeup = await writeupService.approveWriteup(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { writeup });
}

export async function reject(req: Request, res: Response) {
  const writeup = await writeupService.rejectWriteup(req.user!.sub, getParam(req, 'id'), req.body.reason);
  sendSuccess(res, { writeup });
}

export async function archive(req: Request, res: Response) {
  const writeup = await writeupService.archiveWriteup(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { writeup });
}
