import type { Request, Response } from 'express';
import * as submissionService from '../services/submission.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function submit(req: Request, res: Response) {
  const result = await submissionService.submitFlag(
    req.user!.sub,
    getParam(req, 'id'),
    req.body.flag,
    req.ip,
  );
  sendSuccess(res, result);
}
