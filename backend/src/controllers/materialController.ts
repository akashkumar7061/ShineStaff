import { Response } from 'express';
import MaterialRequest from '../models/MaterialRequest';
import User from '../models/User';
import Settings from '../models/Settings';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { logAudit } from '../utils/auditLog';
import { sendWhatsAppMessage } from '../utils/whatsappHelper';

export const getMaterialRequests = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { status, workerId, company } = req.query;
    const filter: any = {};

    if (req.user.role === 'worker') {
      filter.workerId = req.user.id;
    } else {
      if (workerId) filter.workerId = workerId;
      if (company && company !== 'All') {
        filter.company = { $in: [company, 'Both'] };
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const requests = await MaterialRequest.find(filter)
      .populate('workerId', 'name email phone company photo')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createMaterialRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can submit material requests' });
  }

  const { items, urgency, reason, jobId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Please specify at least one material/chemical item' });
  }

  try {
    const worker = await User.findById(req.user.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    const materialRequest = new MaterialRequest({
      workerId: worker._id,
      company: worker.company || 'SofaShine',
      items: items.map((i: any) => ({
        itemName: i.itemName?.trim() || 'General Material',
        quantity: i.quantity?.trim() || '1 Unit'
      })),
      urgency: urgency || 'Normal',
      reason: reason || '',
      jobId: jobId || undefined,
      status: 'pending'
    });

    await materialRequest.save();

    // Summary of requested items
    const itemsSummary = materialRequest.items
      .map((it: any) => `• ${it.itemName} (${it.quantity})`)
      .join('\n');

    // 1. Socket.io Alert to Admin
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'MATERIAL_REQUEST_SUBMITTED',
        message: `📦 Material Request (${materialRequest.urgency}): ${worker.name} requested ${materialRequest.items.length} items.`
      });
    }

    // 2. Automated WhatsApp Alert if Admin Phone is configured
    const settings = await Settings.findOne({ settingsId: 'global' });
    const adminPhone = settings?.adminAlertPhone || '';

    let whatsappSent = false;
    if (adminPhone) {
      try {
        const textMsg = `🚨 *ShineStaff Material Request Alert*\n\n👤 *Worker:* ${worker.name} (${worker.company})\n📞 *Phone:* ${worker.phone}\n⚡ *Urgency:* ${materialRequest.urgency}\n\n📦 *Items Requested:*\n${itemsSummary}${materialRequest.reason ? `\n\n📝 *Notes:* ${materialRequest.reason}` : ''}\n\n_Review and dispatch in ShineStaff Admin Panel._`;
        
        await sendWhatsAppMessage(
          adminPhone,
          textMsg,
          'Admin',
          'reminder',
          { customerId: undefined },
          undefined
        );
        whatsappSent = true;
      } catch (waErr) {
        console.error('[MaterialRequest] WhatsApp auto-send error:', waErr);
      }
    }

    // Also build direct WhatsApp URL for worker click-to-send
    const directWaPhone = adminPhone ? adminPhone.replace(/\D/g, '') : '';
    const directWaMessage = `Hello Admin, I have submitted a Material Request:\n\nWorker: ${worker.name} (${worker.company})\nUrgency: ${materialRequest.urgency}\n\nItems Needed:\n${itemsSummary}${materialRequest.reason ? `\n\nNotes: ${materialRequest.reason}` : ''}`;
    const directWaUrl = directWaPhone
      ? `https://wa.me/${directWaPhone}?text=${encodeURIComponent(directWaMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(directWaMessage)}`;

    res.status(201).json({
      message: 'Material request submitted successfully',
      materialRequest,
      whatsappSent,
      directWaUrl
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateMaterialRequestStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can update material requests' });
  }

  const { id } = req.params;
  const { status, adminRemarks } = req.body;

  try {
    const materialRequest = await MaterialRequest.findById(id).populate('workerId');
    if (!materialRequest) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    materialRequest.status = status;
    if (adminRemarks !== undefined) {
      materialRequest.adminRemarks = adminRemarks;
    }
    if (['approved', 'dispatched', 'completed', 'rejected'].includes(status)) {
      materialRequest.resolvedAt = new Date();
      materialRequest.resolvedBy = req.user.id as any;
    }

    await materialRequest.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'MaterialRequest',
      entityId: materialRequest._id.toString(),
      summary: `Updated material request to ${status.toUpperCase()} for ${(materialRequest.workerId as any)?.name || 'Worker'}`
    });

    // Notify worker over socket
    const io = getIO();
    if (io && materialRequest.workerId) {
      const workerIdStr = (materialRequest.workerId as any)._id?.toString() || materialRequest.workerId.toString();
      io.to(workerIdStr).emit('notification', {
        type: 'MATERIAL_REQUEST_STATUS',
        message: `Your material request has been updated to "${status.toUpperCase()}" by Admin.`
      });
    }

    res.status(200).json({
      message: `Material request marked as ${status}`,
      materialRequest
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
