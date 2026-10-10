import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function getProfile(req: Request, res: Response) {
  const detail = await userService.getProfileDetail(req.user!.sub);
  sendSuccess(res, detail);
}

export async function getPublicProfile(req: Request, res: Response) {
  const profile = await userService.getPublicProfile(getParam(req, 'username'));
  sendSuccess(res, { profile });
}

export async function updateProfile(req: Request, res: Response) {
  const user = await userService.updateProfile(req.user!.sub, req.body);
  sendSuccess(res, { user });
}
