import { Router } from 'express';
import { getSettings, updateSettings, testGoogleMapsKey } from '../controllers/settingsController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.put('/', authorizeRoles('admin'), updateSettings);
router.post('/test-google-maps', authorizeRoles('admin'), testGoogleMapsKey);

export default router;
