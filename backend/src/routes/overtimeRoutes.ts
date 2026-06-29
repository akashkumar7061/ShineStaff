import { Router } from 'express';
import { createOvertime, getOvertimes, deleteOvertime } from '../controllers/overtimeController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Admin-only operations for managing overtime logs
router.post('/', authorizeRoles('admin'), createOvertime);
router.get('/', authorizeRoles('admin'), getOvertimes);
router.delete('/:id', authorizeRoles('admin'), deleteOvertime);

export default router;
