import type { Request, Response } from 'express';
import * as statisticsService from '../services/statistics.service.js';
import { sendSuccess } from '../utils/response.js';
import type { StatisticsRangeQuery } from '../validators/statistics.schema.js';

function getRange(req: Request) {
  return (req.query as unknown as StatisticsRangeQuery).range;
}

export async function overview(_req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getOverview());
}

export async function users(req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getUserStats(getRange(req)));
}

export async function challenges(req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getChallengeStats(getRange(req)));
}

export async function submissions(req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getSubmissionStats(getRange(req)));
}

export async function teams(req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getTeamStats(getRange(req)));
}

export async function writeups(req: Request, res: Response) {
  sendSuccess(res, await statisticsService.getWriteupStats(getRange(req)));
}
