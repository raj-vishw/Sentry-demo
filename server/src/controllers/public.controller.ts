import type { Request, Response } from 'express';
import * as publicService from '../services/public.service.js';
import * as docsService from '../services/docs.service.js';
import * as pageService from '../services/page.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function stats(_req: Request, res: Response) {
  const result = await publicService.getPublicStats();
  sendSuccess(res, result);
}

export async function categoryCounts(_req: Request, res: Response) {
  const result = await publicService.getPublicCategoryCounts();
  sendSuccess(res, result);
}

export async function platformConfig(_req: Request, res: Response) {
  const result = await publicService.getPublicPlatformConfig();
  sendSuccess(res, result);
}

export async function listDocs(_req: Request, res: Response) {
  sendSuccess(res, { groups: docsService.listDocs() });
}

export async function getDoc(req: Request, res: Response) {
  const doc = await docsService.getDoc(getParam(req, 'slug'));
  sendSuccess(res, { doc });
}

export async function listPages(_req: Request, res: Response) {
  const pages = await pageService.listPages();
  sendSuccess(res, { pages });
}

export async function getPage(req: Request, res: Response) {
  const page = await pageService.getPage(getParam(req, 'slug'));
  sendSuccess(res, { page });
}
