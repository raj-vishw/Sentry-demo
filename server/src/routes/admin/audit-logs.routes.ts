import { Router } from 'express';
import * as auditLogController from '../../controllers/auditLog.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { listAuditLogsQuerySchema } from '../../validators/auditLog.schema.js';

const router = Router();

// Read-only from every angle — nothing ever updates or deletes an entry.
router.get('/', validate(listAuditLogsQuerySchema, 'query'), auditLogController.list);

export default router;
