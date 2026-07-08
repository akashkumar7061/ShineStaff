import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, getProfile, updateProfile, refresh, logout, subscribePush } from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);
router.post('/subscribe-push', authenticateJWT, subscribePush);

export default router;
