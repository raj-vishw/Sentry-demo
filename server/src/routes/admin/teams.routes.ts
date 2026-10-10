import { Router } from 'express';
import * as adminTeamController from '../../controllers/adminTeam.controller.js';

// Deliberately minimal — team management otherwise stays owner-only via
// the player-facing /teams routes (see AdminTeamsPage.tsx's own read-only
// framing). This is the one admin-only action a team itself can't take:
// hiding it from the public team leaderboard.
const router = Router();

router.post('/:id/hide', adminTeamController.hide);
router.post('/:id/unhide', adminTeamController.unhide);

export default router;
