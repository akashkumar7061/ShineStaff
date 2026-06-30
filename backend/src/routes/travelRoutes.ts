import { Router } from 'express';
import { submitTravelLog, getTravelLogs, approveTravelLog, updateTravelLog } from '../controllers/travelController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Workers log commutes
router.post('/submit', authorizeRoles('worker'), submitTravelLog);

// Admin accesses and approves commuter allowances
router.get('/all', authorizeRoles('admin'), getTravelLogs);
router.put('/:id/approve', authorizeRoles('admin'), approveTravelLog);
router.put('/:id', authorizeRoles('admin'), updateTravelLog);

export default router;
