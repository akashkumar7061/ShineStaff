import { Router } from 'express';
import {
  exportAttendanceCSV,
  exportWorkerCSV,
  exportSalaryCSV,
  exportPhotoCSV
} from '../controllers/reportController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/attendance', exportAttendanceCSV);
router.get('/workers', exportWorkerCSV);
router.get('/salary', exportSalaryCSV);
router.get('/photos', exportPhotoCSV);

export default router;
