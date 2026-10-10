import type { Request, Response } from 'express';
import * as reportService from '../services/report.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';
import type { ListAdminReportsQuery } from '../validators/report.schema.js';

export async function create(req: Request, res: Response) {
  const report = await reportService.createReport(req.user!.sub, req.body);
  sendSuccess(res, { report }, 201);
}

// --- Admin review (mounted under /api/v1/admin/reports) ---

export async function list(req: Request, res: Response) {
  const result = await reportService.listReports(req.query as unknown as ListAdminReportsQuery);
  sendSuccess(res, result);
}

export async function resolve(req: Request, res: Response) {
  const report = await reportService.resolveReport(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { report });
}

export async function dismiss(req: Request, res: Response) {
  const report = await reportService.dismissReport(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { report });
}
