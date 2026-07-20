import { Router } from 'express';
import { recordPayment, getPayments, getPaymentAnalytics } from '../controllers/paymentController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Workers or Admin can record payments
router.post('/record', recordPayment);

// Admin-only endpoints for viewing payments & collection analytics
router.get('/all', authorizeRoles('admin'), getPayments);
router.get('/analytics', authorizeRoles('admin'), getPaymentAnalytics);

export default router;
