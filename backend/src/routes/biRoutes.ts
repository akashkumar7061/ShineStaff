import { Router } from 'express';
import { getBIDashboardData } from '../controllers/biController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/analytics', getBIDashboardData);

export default router;
