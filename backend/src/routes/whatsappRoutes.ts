import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import {
  getAnalytics,
  getCustomers,
  getCustomerDetail,
  updateCustomerOptOut,
  createCustomer,
  getReminders,
  sendManualReminder,
  sendBulkManualReminders,
  createCampaign,
  getCampaigns,
  getMessageHistory,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  triggerManualBackfill,
  editMessageLog,
  deleteMessageLog
} from '../controllers/whatsappController';

const router = Router();

// Protect all routes under /api/whatsapp to authorized Admin role only
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/analytics', getAnalytics);
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomerDetail);
router.put('/customers/:id/opt-out', updateCustomerOptOut);
router.get('/reminders', getReminders);
router.post('/reminders/bulk-send', sendBulkManualReminders);
router.post('/reminders/:id/send', sendManualReminder);
router.post('/campaigns', createCampaign);
router.get('/campaigns', getCampaigns);
router.get('/history', getMessageHistory);
router.put('/history/:id', editMessageLog);
router.delete('/history/:id', deleteMessageLog);
router.get('/settings', getWhatsAppSettings);
router.put('/settings', updateWhatsAppSettings);
router.post('/settings/trigger-backfill', triggerManualBackfill);

export default router;
