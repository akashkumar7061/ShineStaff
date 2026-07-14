import express from 'express';
import { getDrafts, upsertDraft, deleteDraft } from '../controllers/draftController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/', getDrafts);
router.post('/', upsertDraft);
router.delete('/:draftId', deleteDraft);

export default router;
