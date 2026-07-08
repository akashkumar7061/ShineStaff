import { Router } from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  startJob,
  completeJob,
  cancelJob,
  deleteJob,
  updateJob,
  updateJobFuel
} from '../controllers/jobController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getJobs);
router.get('/:id', getJobById);

// Worker job action triggers
router.put('/:id/start', authorizeRoles('worker'), startJob);
router.put('/:id/complete', authorizeRoles('worker'), completeJob);
router.put('/:id/fuel', authorizeRoles('worker', 'admin'), updateJobFuel);

// Admin-only endpoints for CRUD
router.post('/', authorizeRoles('admin'), createJob);
router.put('/:id', authorizeRoles('admin'), updateJob);
router.delete('/:id', authorizeRoles('admin'), deleteJob);

// Shared status edit (e.g. cancellation)
router.put('/:id/cancel', cancelJob);

export default router;
