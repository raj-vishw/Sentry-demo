import type { Request, Response } from 'express';
import * as teamService from '../services/team.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function hide(req: Request, res: Response) {
  const team = await teamService.setTeamHidden(req.user!.sub, getParam(req, 'id'), true);
  sendSuccess(res, { team });
}

export async function unhide(req: Request, res: Response) {
  const team = await teamService.setTeamHidden(req.user!.sub, getParam(req, 'id'), false);
  sendSuccess(res, { team });
}
