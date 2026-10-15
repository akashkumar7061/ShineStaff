import { Response } from 'express';
import MaterialRequest from '../models/MaterialRequest';
import MaterialCatalog from '../models/MaterialCatalog';
import User from '../models/User';
import Settings from '../models/Settings';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { logAudit } from '../utils/auditLog';
import { sendWhatsAppMessage } from '../utils/whatsappHelper';

const INITIAL_MATERIALS = [
  { name: 'Fabric & Sofa Shampoo (5L)', category: 'Cleaning Chemical', defaultUnit: '5L Can' },
  { name: 'Foam Cleaning Booster', category: 'Cleaning Chemical', defaultUnit: '1 Bottle' },
  { name: 'Stain Remover Liquid', category: 'Cleaning Chemical', defaultUnit: '1 Bottle' },
  { name: 'Microfiber Cleaning Cloths (Pack of 5)', category: 'Cleaning Tools', defaultUnit: '1 Pack' },
  { name: 'Heavy Duty Scrubbing Brush', category: 'Cleaning Tools', defaultUnit: '1 Pc' },
  { name: 'Soft Upholstery Brush', category: 'Cleaning Tools', defaultUnit: '1 Pc' },
  { name: 'Vacuum Extraction Filter', category: 'Machine Parts', defaultUnit: '1 Pc' },
  { name: 'Disinfectant & Fragrance Mist', category: 'Cleaning Chemical', defaultUnit: '1 Can' },
  { name: 'Rubber Safety Gloves', category: 'Safety Equipment', defaultUnit: '1 Pair' },
  { name: 'Extension Cable / Power Strip', category: 'Equipment', defaultUnit: '1 Pc' },
  { name: 'Leather Conditioner Cream', category: 'Cleaning Chemical', defaultUnit: '1 Bottle' }
];

// Helper to seed initial materials if catalog is empty
const ensureCatalogSeeded = async () => {
  const count = await MaterialCatalog.countDocuments();
  if (count === 0) {
    await MaterialCatalog.insertMany(INITIAL_MATERIALS.map(m => ({ ...m, isActive: true })));
  }
};

// GET /api/material-requests/catalog - Fetch active materials for dropdown (Worker & Admin)
export const getMaterialCatalog = async (req: AuthRequest, res: Response) => {
  try {
    await ensureCatalogSeeded();
    const catalog = await MaterialCatalog.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(catalog);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch material catalog', error: error.message });
  }
};

// GET /api/material-requests/catalog/all - Fetch all materials for Admin management
export const getAllCatalogAdmin = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    await ensureCatalogSeeded();
    const catalog = await MaterialCatalog.find().sort({ createdAt: -1 });
    res.status(200).json(catalog);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch catalog', error: error.message });
  }
};

// POST /api/material-requests/catalog - Admin adds new material to catalog
export const addCatalogItem = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const { name, category, defaultUnit, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Material name is required' });
    }

    const cleanName = name.trim();
    const existing = await MaterialCatalog.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        if (category) existing.category = category.trim();
        if (defaultUnit) existing.defaultUnit = defaultUnit.trim();
        await existing.save();
        return res.status(200).json({ message: 'Material reactivated in dropdown catalog', item: existing });
      }
      return res.status(400).json({ message: 'Material with this name already exists in catalog' });
    }

    const newItem = new MaterialCatalog({
      name: cleanName,
      category: category?.trim() || 'General Material',
      defaultUnit: defaultUnit?.trim() || '1 Unit',
      description: description?.trim() || '',
      isActive: true,
      createdBy: req.user?.id
    });

    await newItem.save();

    logAudit(req, {
      action: 'created',
      entityType: 'MaterialCatalog',
      entityId: newItem._id.toString(),
      summary: `Added new material "${newItem.name}" to inventory catalog`
    });

    res.status(201).json({ message: 'Material added to catalog successfully', item: newItem });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add material', error: error.message });
  }
};

// DELETE /api/material-requests/catalog/:id - Admin removes or disables material
export const deleteCatalogItem = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params;

  try {
    const item = await MaterialCatalog.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Material not found in catalog' });
    }

    await MaterialCatalog.findByIdAndDelete(id);

    logAudit(req, {
      action: 'deleted',
      entityType: 'MaterialCatalog',
      entityId: id,
      summary: `Removed material "${item.name}" from catalog`
    });

    res.status(200).json({ message: `Material "${item.name}" removed from catalog` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove material', error: error.message });
  }
};

// GET /api/material-requests - List requests
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

// POST /api/material-requests/request - Worker submits multiple materials
export const createMaterialRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can submit material requests' });
  }

  const { items, urgency, reason, neededByDate, jobId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Please specify at least one material/chemical item' });
  }

  const cleanItems = items
    .filter((i: any) => i && i.itemName && i.itemName.trim())
    .map((i: any) => ({
      itemName: i.itemName.trim(),
      quantity: i.quantity?.trim() || '1 Unit'
    }));

  if (cleanItems.length === 0) {
    return res.status(400).json({ message: 'Please specify at least one valid material name' });
  }

  try {
    const worker = await User.findById(req.user.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    const materialRequest = new MaterialRequest({
      workerId: worker._id,
      company: worker.company || 'SofaShine',
      items: cleanItems,
      urgency: urgency || 'Normal',
      reason: reason || '',
      neededByDate: neededByDate || '',
      neededBy: neededByDate ? new Date(neededByDate) : undefined,
      jobId: jobId || undefined,
      status: 'pending'
    });

    await materialRequest.save();

    // Summary of requested items
    const itemsSummary = materialRequest.items
      .map((it: any) => `• ${it.itemName} (Qty: ${it.quantity})`)
      .join('\n');

    const neededDateText = materialRequest.neededByDate ? `\n📅 *Needed By:* ${materialRequest.neededByDate}` : '';

    // 1. Socket.io Alert to Admin
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'MATERIAL_REQUEST_SUBMITTED',
        message: `📦 Material Request (${materialRequest.urgency}): ${worker.name} requested ${materialRequest.items.length} item(s).`,
        requestId: materialRequest._id,
        workerName: worker.name,
        workerPhone: worker.phone,
        company: worker.company,
        urgency: materialRequest.urgency,
        itemsCount: materialRequest.items.length,
        items: cleanItems,
        reason: materialRequest.reason,
        neededByDate: materialRequest.neededByDate,
        createdAt: materialRequest.createdAt
      });
    }

    // 2. Automated WhatsApp Alert if Admin Phone is configured
    const settings = await Settings.findOne({ settingsId: 'global' });
    const adminPhone = settings?.adminAlertPhone || '';

    let whatsappSent = false;
    if (adminPhone) {
      try {
        const textMsg = `🚨 *ShineStaff Material Request Alert*\n\n👤 *Worker:* ${worker.name} (${worker.company})\n📞 *Phone:* ${worker.phone}\n⚡ *Urgency:* ${materialRequest.urgency}${neededDateText}\n\n📦 *Items Requested:*\n${itemsSummary}${materialRequest.reason ? `\n\n📝 *Notes:* ${materialRequest.reason}` : ''}\n\n_Review and dispatch in ShineStaff Admin Panel._`;

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

    // Direct WhatsApp URL for worker click-to-send
    const directWaPhone = adminPhone ? adminPhone.replace(/\D/g, '') : '';
    const directWaMessage = `Hello Admin, I have submitted a Material Request:\n\nWorker: ${worker.name} (${worker.company})\nUrgency: ${materialRequest.urgency}${materialRequest.neededByDate ? `\nNeeded By: ${materialRequest.neededByDate}` : ''}\n\nItems Needed:\n${itemsSummary}${materialRequest.reason ? `\n\nNotes: ${materialRequest.reason}` : ''}`;
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

// PUT /api/material-requests/:id/status - Admin updates request status
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

    if (io) {
      io.emit('adminNotification', {
        type: 'MATERIAL_REQUEST_UPDATED',
        requestId: materialRequest._id,
        status
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
