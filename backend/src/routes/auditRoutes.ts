import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('admin'), getAuditLogs);

export default router;
