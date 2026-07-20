import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import QRCode from '../models/QRCode';
import Settings from '../models/Settings';
import { logAudit } from '../utils/auditLog';

// 1. Verify Security Password for Admin QR Management
export const verifySecurityPassword = async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  try {
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = await Settings.create({ settingsId: 'global', qrSecurityPassword: 'admin123' });
    }

    const currentPass = settings.qrSecurityPassword || 'admin123';
    if (password === currentPass) {
      return res.json({ verified: true, message: 'Security password verified successfully.' });
    } else {
      return res.status(401).json({ verified: false, message: 'Invalid security password. Access denied.' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Update Security Password
export const updateSecurityPassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ message: 'New security password must be at least 4 characters long.' });
    }

    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = await Settings.create({ settingsId: 'global', qrSecurityPassword: 'admin123' });
    }

    const currentPass = settings.qrSecurityPassword || 'admin123';
    if (currentPassword !== currentPass) {
      return res.status(401).json({ message: 'Incorrect current security password.' });
    }

    settings.qrSecurityPassword = newPassword.trim();
    await settings.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      summary: 'Updated QR Payment Management security password'
    });

    res.json({ message: 'Security password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Get All Saved QR Codes
export const getQRCodes = async (req: AuthRequest, res: Response) => {
  try {
    const qrs = await QRCode.find().sort({ isDefault: -1, createdAt: -1 });
    res.json(qrs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. Get Active Mapped QR Code for Worker Payment Screen by Company
export const getCompanyActiveQR = async (req: AuthRequest, res: Response) => {
  const { company } = req.params;
  try {
    // 1. Primary priority: Return the QR that Admin explicitly marked as Default Primary (isDefault: true)
    let qr = await QRCode.findOne({ isDefault: true, isActive: true });

    // 2. Fallback: If no default primary QR is set, check company-specific active QR
    if (!qr && company && company !== 'undefined') {
      qr = await QRCode.findOne({
        company: { $regex: new RegExp(`^${company}$`, 'i') },
        isActive: true
      });
    }

    // 3. Fallback to active QR mapped to 'All'
    if (!qr) {
      qr = await QRCode.findOne({ company: 'All', isActive: true });
    }

    // 4. Fallback to any active QR
    if (!qr) {
      qr = await QRCode.findOne({ isActive: true });
    }

    if (!qr) {
      return res.status(404).json({ message: 'No active QR Code found.' });
    }

    res.json(qr);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 5. Add New QR Code
export const createQRCode = async (req: AuthRequest, res: Response) => {
  const { name, company, accountHolder, upiId, bankName, qrImage, description, isDefault } = req.body;
  try {
    if (!name || !accountHolder || !upiId || !qrImage) {
      return res.status(400).json({ message: 'Name, Account Holder, UPI ID, and QR Image are required fields.' });
    }

    if (isDefault) {
      await QRCode.updateMany({}, { isDefault: false });
    }

    const newQR = new QRCode({
      name,
      company: company || 'All',
      accountHolder,
      upiId,
      bankName: bankName || '',
      qrImage,
      description: description || '',
      isActive: true,
      isDefault: isDefault || false,
      createdBy: req.user?.id
    });

    await newQR.save();

    logAudit(req, {
      action: 'created',
      entityType: 'QRCode',
      entityId: newQR._id.toString(),
      summary: `Added new QR Code: ${name} (${company}) - ${upiId}`
    });

    res.status(201).json(newQR);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 6. Update Existing QR Code
export const updateQRCode = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, company, accountHolder, upiId, bankName, qrImage, description, isActive, isDefault } = req.body;
  try {
    const qr = await QRCode.findById(id);
    if (!qr) {
      return res.status(404).json({ message: 'QR Code not found.' });
    }

    if (isDefault) {
      await QRCode.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    qr.name = name || qr.name;
    qr.company = company || qr.company;
    qr.accountHolder = accountHolder || qr.accountHolder;
    qr.upiId = upiId || qr.upiId;
    qr.bankName = bankName !== undefined ? bankName : qr.bankName;
    qr.qrImage = qrImage || qr.qrImage;
    qr.description = description !== undefined ? description : qr.description;
    if (isActive !== undefined) qr.isActive = isActive;
    if (isDefault !== undefined) qr.isDefault = isDefault;

    await qr.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'QRCode',
      entityId: qr._id.toString(),
      summary: `Updated QR Code: ${qr.name} (${qr.company})`
    });

    res.json(qr);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 7. Delete QR Code
export const deleteQRCode = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const qr = await QRCode.findById(id);
    if (!qr) {
      return res.status(404).json({ message: 'QR Code not found.' });
    }

    await QRCode.findByIdAndDelete(id);

    logAudit(req, {
      action: 'deleted',
      entityType: 'QRCode',
      entityId: id,
      summary: `Deleted QR Code: ${qr.name} (${qr.upiId})`
    });

    res.json({ message: 'QR Code deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 8. Toggle Active / Set Default Status
export const setActiveQR = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isActive, isDefault } = req.body;
  try {
    const qr = await QRCode.findById(id);
    if (!qr) {
      return res.status(404).json({ message: 'QR Code not found.' });
    }

    if (isDefault) {
      await QRCode.updateMany({ _id: { $ne: id } }, { isDefault: false });
      qr.isDefault = true;
      qr.isActive = true;
    } else if (isActive !== undefined) {
      qr.isActive = isActive;
    }

    await qr.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'QRCode',
      entityId: id,
      summary: `Toggled active/default status for QR Code: ${qr.name}`
    });

    res.json(qr);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
