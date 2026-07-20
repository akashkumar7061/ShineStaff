import { Router } from 'express';
import {
  verifySecurityPassword,
  updateSecurityPassword,
  getQRCodes,
  getCompanyActiveQR,
  createQRCode,
  updateQRCode,
  deleteQRCode,
  setActiveQR
} from '../controllers/qrController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Worker or Admin endpoint to get mapped active QR code for worker payment screen
router.get('/company/:company', getCompanyActiveQR);

// Admin-only QR management endpoints
router.post('/verify-password', authorizeRoles('admin'), verifySecurityPassword);
router.put('/security-password', authorizeRoles('admin'), updateSecurityPassword);

router.get('/', authorizeRoles('admin'), getQRCodes);
router.post('/', authorizeRoles('admin'), createQRCode);
router.put('/:id', authorizeRoles('admin'), updateQRCode);
router.delete('/:id', authorizeRoles('admin'), deleteQRCode);
router.put('/:id/active', authorizeRoles('admin'), setActiveQR);

export default router;
