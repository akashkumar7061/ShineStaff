import { Router } from 'express';
import {
  getWorkers,
  getWorkerDetails,
  addWorker,
  editWorker,
  deleteWorker,
  updateWorkerLocation,
  getWorkerRecommendations
} from '../controllers/workerController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// Secure all routes
router.use(authenticateJWT);

// Admin-only endpoints for worker CRUD
router.get('/', authorizeRoles('admin'), getWorkers);
router.post('/recommend', authorizeRoles('admin'), getWorkerRecommendations);
router.post('/', authorizeRoles('admin'), addWorker);
router.put('/:id', authorizeRoles('admin'), editWorker);
router.delete('/:id', authorizeRoles('admin'), deleteWorker);

// Access for both (worker can view details, admin can view details)
router.get('/:id', getWorkerDetails);

// Worker location update
router.put('/:id/location', authorizeRoles('worker'), updateWorkerLocation);

export default router;
