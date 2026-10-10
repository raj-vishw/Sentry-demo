import type { Request, Response } from 'express';
import * as announcementService from '../services/announcement.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

// Public — polled by logged-in clients, but reachable without auth too
// (the notification feed itself carries nothing sensitive).
export async function listRecent(req: Request, res: Response) {
  const since = typeof req.query.since === 'string' ? new Date(req.query.since) : undefined;
  const announcements = await announcementService.listRecentAnnouncements(
    since && !Number.isNaN(since.getTime()) ? since : undefined,
  );
  sendSuccess(res, { announcements });
}

export async function listAdmin(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await announcementService.listAnnouncementsAdmin(page, limit);
  sendSuccess(res, result);
}

export async function create(req: Request, res: Response) {
  const announcement = await announcementService.createAnnouncement(req.user!.sub, req.body.message);
  sendSuccess(res, { announcement }, 201);
}

export async function remove(req: Request, res: Response) {
  await announcementService.deleteAnnouncement(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}
