import { Request, Response } from 'express';
import Settings from '../models/Settings';
import { uploadToCloudinary } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLog';

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  const {
    sofaShineLogoDataUrl,
    cleanCruisersLogoDataUrl,
    fuelAllowanceRate,
    lateTimeGraceMins,
    halfDayThresholdHours,
    adminEmailForAlerts
  } = req.body;

  try {
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
    }

    if (sofaShineLogoDataUrl && !sofaShineLogoDataUrl.startsWith('http')) {
      settings.sofaShineLogo = await uploadToCloudinary(sofaShineLogoDataUrl, 'company_logos');
    }
    if (cleanCruisersLogoDataUrl && !cleanCruisersLogoDataUrl.startsWith('http')) {
      settings.cleanCruisersLogo = await uploadToCloudinary(cleanCruisersLogoDataUrl, 'company_logos');
    }

    settings.fuelAllowanceRate = fuelAllowanceRate !== undefined ? Number(fuelAllowanceRate) : settings.fuelAllowanceRate;
    settings.lateTimeGraceMins = lateTimeGraceMins !== undefined ? Number(lateTimeGraceMins) : settings.lateTimeGraceMins;
    settings.halfDayThresholdHours = halfDayThresholdHours !== undefined ? Number(halfDayThresholdHours) : settings.halfDayThresholdHours;
    settings.adminEmailForAlerts = adminEmailForAlerts !== undefined ? adminEmailForAlerts : settings.adminEmailForAlerts;

    await settings.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'Settings',
      entityId: settings._id.toString(),
      summary: 'Updated company settings'
    });

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
