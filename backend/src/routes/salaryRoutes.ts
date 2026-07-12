import { Router } from 'express';
import {
  getSalaryDashboard,
  getBulkSalaryDashboard,
  getSalaryRequests,
  createSalaryRequest,
  processSalaryRequest,
  downloadPayslip,
  recordPayout,
  deleteSalaryRequest,
  updateSalaryRequest
} from '../controllers/salaryController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/dashboard', getSalaryDashboard);
router.get('/bulk-dashboard', authorizeRoles('admin'), getBulkSalaryDashboard);
router.get('/requests', getSalaryRequests);
router.post('/requests', authorizeRoles('worker'), createSalaryRequest);
router.put('/requests/:id', authorizeRoles('admin'), processSalaryRequest);
router.delete('/requests/:id', authorizeRoles('admin'), deleteSalaryRequest);
router.post('/payouts', authorizeRoles('admin'), recordPayout);
router.put('/payouts/:id', authorizeRoles('admin'), updateSalaryRequest);
router.get('/payslip', downloadPayslip);

export default router;
