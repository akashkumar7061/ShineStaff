import { Router } from 'express';
import { getLeaves, applyLeave, processLeave } from '../controllers/leaveController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getLeaves);
router.post('/apply', authorizeRoles('worker'), applyLeave);
router.put('/:id/process', authorizeRoles('admin'), processLeave);

export default router;
