import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller.js';
import { attachUserIfPresent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { leaderboardQuerySchema, teamLeaderboardQuerySchema } from '../validators/leaderboard.schema.js';

const router = Router();

// Optional auth: logged-out visitors still see the board, just without a
// "my position" callout.
router.get('/', attachUserIfPresent, validate(leaderboardQuerySchema, 'query'), leaderboardController.getGlobal);
router.get('/teams', attachUserIfPresent, validate(teamLeaderboardQuerySchema, 'query'), leaderboardController.getTeams);

export default router;
