import type { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboard.service.js';
import { getCompetitionConfig } from '../services/competitionConfig.service.js';
import { sendSuccess } from '../utils/response.js';
import type { LeaderboardQuery, TeamLeaderboardQuery } from '../validators/leaderboard.schema.js';

const HIDDEN_RESPONSE = {
  hidden: true,
  entries: [],
  pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
  me: null,
  frozen: false,
  freezeTime: null,
};

/**
 * Same shape either way (`hidden` is just `false` on the normal path) so
 * older frontend code that doesn't know about this field still renders an
 * empty board gracefully instead of crashing on a missing key.
 */
async function isLeaderboardHidden(isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return false;
  const competition = await getCompetitionConfig();
  return competition.leaderboardVisibility === 'hidden';
}

export async function getGlobal(req: Request, res: Response) {
  const isAdmin = req.user?.role === 'ADMIN';
  if (await isLeaderboardHidden(isAdmin)) {
    sendSuccess(res, HIDDEN_RESPONSE);
    return;
  }
  const { scope, page, limit } = req.query as unknown as LeaderboardQuery;
  const result = await leaderboardService.getLeaderboard(scope, page, limit, req.user?.sub, isAdmin);
  sendSuccess(res, { ...result, hidden: false });
}

export async function getTeams(req: Request, res: Response) {
  const isAdmin = req.user?.role === 'ADMIN';
  if (await isLeaderboardHidden(isAdmin)) {
    sendSuccess(res, HIDDEN_RESPONSE);
    return;
  }
  const { page, limit } = req.query as unknown as TeamLeaderboardQuery;
  const result = await leaderboardService.getTeamLeaderboard(page, limit, isAdmin);
  sendSuccess(res, { ...result, hidden: false });
}
