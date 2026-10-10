import type { Request, Response } from 'express';
import * as adminSubmissionService from '../services/adminSubmission.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';
import type { ListAdminSubmissionsQuery, ExportSubmissionsQuery } from '../validators/adminSubmission.schema.js';

export async function list(req: Request, res: Response) {
  const result = await adminSubmissionService.listSubmissions(req.query as unknown as ListAdminSubmissionsQuery);
  sendSuccess(res, result);
}

export async function exportCsv(req: Request, res: Response) {
  const csv = await adminSubmissionService.exportSubmissionsCsv(req.query as unknown as ExportSubmissionsQuery);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
  res.send(csv);
}

export async function invalidate(req: Request, res: Response) {
  await adminSubmissionService.invalidateSubmission(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { invalidated: true });
}
