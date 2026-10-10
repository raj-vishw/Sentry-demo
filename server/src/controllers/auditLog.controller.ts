import type { Request, Response } from 'express';
import * as auditLogService from '../services/auditLog.service.js';
import { sendSuccess } from '../utils/response.js';
import type { ListAuditLogsQuery } from '../validators/auditLog.schema.js';

export async function list(req: Request, res: Response) {
  const result = await auditLogService.listAuditLogs(req.query as unknown as ListAuditLogsQuery);
  sendSuccess(res, result);
}
