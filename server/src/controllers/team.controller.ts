import type { Request, Response } from 'express';
import * as teamService from '../services/team.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';
import type { ListTeamsQuery } from '../validators/team.schema.js';

export async function list(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as ListTeamsQuery;
  const result = await teamService.listTeams(page, limit);
  sendSuccess(res, result);
}

export async function getMine(req: Request, res: Response) {
  const team = await teamService.getMyTeam(req.user!.sub);
  sendSuccess(res, { team });
}

export async function getBySlug(req: Request, res: Response) {
  const team = await teamService.getTeamBySlug(getParam(req, 'slug'), req.user?.sub);
  sendSuccess(res, { team });
}

export async function create(req: Request, res: Response) {
  const team = await teamService.createTeam(req.user!.sub, req.body);
  sendSuccess(res, { team }, 201);
}

export async function update(req: Request, res: Response) {
  const team = await teamService.updateTeam(req.user!.sub, req.body);
  sendSuccess(res, { team });
}

export async function join(req: Request, res: Response) {
  const team = await teamService.joinTeam(req.user!.sub, req.body.inviteCode);
  sendSuccess(res, { team });
}

export async function leave(req: Request, res: Response) {
  const result = await teamService.leaveTeam(req.user!.sub);
  sendSuccess(res, result);
}

export async function removeMember(req: Request, res: Response) {
  const team = await teamService.removeMember(req.user!.sub, getParam(req, 'userId'));
  sendSuccess(res, { team });
}

export async function transferOwnership(req: Request, res: Response) {
  const team = await teamService.transferOwnership(req.user!.sub, getParam(req, 'userId'));
  sendSuccess(res, { team });
}

export async function regenerateInviteCode(req: Request, res: Response) {
  const team = await teamService.regenerateInviteCode(req.user!.sub);
  sendSuccess(res, { team });
}

export async function disband(req: Request, res: Response) {
  await teamService.disbandTeam(req.user!.sub);
  sendSuccess(res, { disbanded: true });
}
