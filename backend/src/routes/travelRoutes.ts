import { Router } from 'express';
import { submitTravelLog, getTravelLogs, approveTravelLog, updateTravelLog, adminSubmitTravelLog } from '../controllers/travelController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Workers log commutes
router.post('/submit', authorizeRoles('worker'), submitTravelLog);

// Admin accesses, adds, and approves commuter allowances
router.post('/admin-submit', authorizeRoles('admin'), adminSubmitTravelLog);
router.get('/all', authorizeRoles('admin'), getTravelLogs);
router.put('/:id/approve', authorizeRoles('admin'), approveTravelLog);
router.put('/:id', authorizeRoles('admin'), updateTravelLog);

export default router;
