import type { Request, Response } from 'express';
import * as pageService from '../services/page.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function list(_req: Request, res: Response) {
  const pages = await pageService.listPagesAdmin();
  sendSuccess(res, { pages });
}

export async function create(req: Request, res: Response) {
  const page = await pageService.createPage(req.user!.sub, req.body);
  sendSuccess(res, { page }, 201);
}

export async function update(req: Request, res: Response) {
  const page = await pageService.updatePage(req.user!.sub, getParam(req, 'id'), req.body);
  sendSuccess(res, { page });
}

export async function remove(req: Request, res: Response) {
  await pageService.deletePage(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}
