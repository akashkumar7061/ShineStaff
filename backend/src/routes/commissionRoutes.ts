import { Router } from 'express';
import {
  getCommissions,
  bulkUpsertCommissions,
  updateCommission,
  deleteCommission
} from '../controllers/commissionController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// Secure all endpoints
router.use(authenticateJWT);

router.get('/', authorizeRoles('admin'), getCommissions);
router.post('/bulk-upsert', authorizeRoles('admin'), bulkUpsertCommissions);
router.put('/:id', authorizeRoles('admin'), updateCommission);
router.delete('/:id', authorizeRoles('admin'), deleteCommission);

export default router;
