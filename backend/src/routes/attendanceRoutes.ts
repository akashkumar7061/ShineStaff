import { Router } from 'express';
import {
  getTodayAttendance,
  getWorkerAttendance,
  markAttendance,
  editAttendance,
  createManualAttendance
} from '../controllers/attendanceController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Worker check-in
router.post('/checkin', authorizeRoles('worker'), markAttendance);

// Worker or Admin viewing log history
router.get('/worker/:workerId', getWorkerAttendance);

// Admin-only endpoints
router.get('/today', authorizeRoles('admin'), getTodayAttendance);
router.put('/:id', authorizeRoles('admin'), editAttendance);
router.post('/manual', authorizeRoles('admin'), createManualAttendance);

export default router;
