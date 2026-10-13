import { Router } from 'express';
import {
  getMaterialRequests,
  createMaterialRequest,
  updateMaterialRequestStatus,
  getMaterialCatalog,
  getAllCatalogAdmin,
  addCatalogItem,
  deleteCatalogItem
} from '../controllers/materialController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Catalog routes
router.get('/catalog', getMaterialCatalog); // Accessible to workers & admins
router.get('/catalog/all', authorizeRoles('admin'), getAllCatalogAdmin);
router.post('/catalog', authorizeRoles('admin'), addCatalogItem);
router.delete('/catalog/:id', authorizeRoles('admin'), deleteCatalogItem);

// Request routes
router.get('/', getMaterialRequests);
router.post('/request', authorizeRoles('worker'), createMaterialRequest);
router.put('/:id/status', authorizeRoles('admin'), updateMaterialRequestStatus);

export default router;
