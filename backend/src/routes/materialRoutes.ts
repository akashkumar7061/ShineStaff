import { Router } from 'express';
import {
  getMaterialRequests,
  createMaterialRequest,
  updateMaterialRequestStatus
} from '../controllers/materialController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getMaterialRequests);
router.post('/request', authorizeRoles('worker'), createMaterialRequest);
router.put('/:id/status', authorizeRoles('admin'), updateMaterialRequestStatus);

export default router;
