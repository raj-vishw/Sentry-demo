import { Router } from 'express';
import * as teamController from '../controllers/team.controller.js';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { joinTeamLimiter } from '../middleware/rateLimit.middleware.js';
import { createTeamSchema, updateTeamSchema, joinTeamSchema, listTeamsQuerySchema } from '../validators/team.schema.js';

const router = Router();

router.get('/', attachUserIfPresent, validate(listTeamsQuerySchema, 'query'), teamController.list);
router.get('/mine', requireAuth, teamController.getMine);
router.get('/:slug', attachUserIfPresent, teamController.getBySlug);

router.post('/', requireAuth, validate(createTeamSchema), teamController.create);
router.patch('/mine', requireAuth, validate(updateTeamSchema), teamController.update);
router.post('/join', requireAuth, joinTeamLimiter, validate(joinTeamSchema), teamController.join);
router.post('/leave', requireAuth, teamController.leave);
router.post('/mine/invite-code/regenerate', requireAuth, teamController.regenerateInviteCode);
router.delete('/mine/members/:userId', requireAuth, teamController.removeMember);
router.post('/mine/transfer/:userId', requireAuth, teamController.transferOwnership);
router.delete('/mine', requireAuth, teamController.disband);

export default router;
