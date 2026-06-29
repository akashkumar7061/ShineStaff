import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.put('/', authorizeRoles('admin'), updateSettings);

export default router;
