import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import challengesRouter from './admin/challenges.routes.js';
import usersRouter from './admin/users.routes.js';
import submissionsRouter from './admin/submissions.routes.js';
import categoriesRouter from './admin/categories.routes.js';
import statisticsRouter from './admin/statistics.routes.js';
import auditLogsRouter from './admin/audit-logs.routes.js';
import writeupsRouter from './admin/writeups.routes.js';
import reportsRouter from './admin/reports.routes.js';
import settingsRouter from './admin/settings.routes.js';
import competitionRouter from './admin/competition.routes.js';
import teamsRouter from './admin/teams.routes.js';
import pagesRouter from './admin/pages.routes.js';
import announcementsRouter from './admin/announcements.routes.js';

const router = Router();

// Every route composed below requires an authenticated ADMIN — enforced
// here, server-side, regardless of what the frontend shows or hides.
router.use(requireAuth, requireRole('ADMIN'));

router.use('/challenges', challengesRouter);
router.use('/users', usersRouter);
router.use('/submissions', submissionsRouter);
router.use('/categories', categoriesRouter);
router.use('/statistics', statisticsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/writeups', writeupsRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/competition', competitionRouter);
router.use('/teams', teamsRouter);
router.use('/pages', pagesRouter);
router.use('/announcements', announcementsRouter);

export default router;
