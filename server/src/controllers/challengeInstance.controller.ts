import type { Request, Response } from 'express';
import * as challengeInstanceService from '../services/challengeInstance.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function create(req: Request, res: Response) {
  const instance = await challengeInstanceService.createInstance(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { instance }, 201);
}

export async function get(req: Request, res: Response) {
  const instance = await challengeInstanceService.getInstance(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { instance });
}

export async function stop(req: Request, res: Response) {
  await challengeInstanceService.stopInstance(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { stopped: true });
}

export async function restart(req: Request, res: Response) {
  await challengeInstanceService.restartInstance(req.user!.sub, getParam(req, 'id'));
  sendSuccess(res, { restarted: true });
}
