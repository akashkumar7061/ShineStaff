import { Router } from 'express';
import {
  getSalaryDashboard,
  getSalaryRequests,
  createSalaryRequest,
  processSalaryRequest,
  downloadPayslip,
  recordPayout,
  deleteSalaryRequest
} from '../controllers/salaryController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/dashboard', getSalaryDashboard);
router.get('/requests', getSalaryRequests);
router.post('/requests', authorizeRoles('worker'), createSalaryRequest);
router.put('/requests/:id', authorizeRoles('admin'), processSalaryRequest);
router.delete('/requests/:id', authorizeRoles('admin'), deleteSalaryRequest);
router.post('/payouts', authorizeRoles('admin'), recordPayout);
router.get('/payslip', downloadPayslip);

export default router;
