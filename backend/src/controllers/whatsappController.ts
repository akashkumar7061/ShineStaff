import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CustomerContact from '../models/CustomerContact';
import ServiceReminder from '../models/ServiceReminder';
import WhatsAppCampaign from '../models/WhatsAppCampaign';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppSetting from '../models/WhatsAppSetting';
import Job from '../models/Job';
import { sendWhatsAppMessage, backfillCustomerContacts } from '../utils/whatsappHelper';
import { logAudit } from '../utils/auditLog';
import { uploadToCloudinary } from '../config/cloudinary';
import mongoose from 'mongoose';

/**
 * Computes analytics for customer retention, WhatsApp delivery stats,
 * and rebooking conversions from reminders.
 */
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const totalCustomers = await CustomerContact.countDocuments();
    const whatsappCustomers = await CustomerContact.countDocuments({ phone: { $ne: '' } });
    
    // Reminders delivery statistics
    const remindersSent = await WhatsAppMessage.countDocuments({ messageType: 'reminder' });
    const remindersDelivered = await WhatsAppMessage.countDocuments({ messageType: 'reminder', status: { $in: ['delivered', 'read'] } });
    const remindersRead = await WhatsAppMessage.countDocuments({ messageType: 'reminder', status: 'read' });
    const remindersFailed = await WhatsAppMessage.countDocuments({ messageType: 'reminder', status: 'failed' });

    // Marketing campaigns statistics
    const marketingSent = await WhatsAppMessage.countDocuments({ messageType: 'marketing' });
    const marketingDelivered = await WhatsAppMessage.countDocuments({ messageType: 'marketing', status: { $in: ['delivered', 'read'] } });
    
    // Repeat booking statistics
    const repeatContacts = await CustomerContact.find({ totalServicesTaken: { $gt: 1 } });
    const repeatBookings = repeatContacts.reduce((acc, c) => acc + (c.totalServicesTaken - 1), 0);
    const revenueFromRepeat = repeatContacts.reduce((acc, c) => acc + c.totalAmountSpent, 0);

    // Retention Rate
    const customerRetentionRate = totalCustomers > 0 
      ? Number(((repeatContacts.length / totalCustomers) * 100).toFixed(1)) 
      : 0;

    // Repeat customers conversion rate (Rebooked after receiving reminder)
    const remindersSentCount = await ServiceReminder.countDocuments({ status: 'sent' });
    // An approximate mock correlation: repeat customers who received reminders
    const rebookedCount = await CustomerContact.countDocuments({
      totalServicesTaken: { $gt: 1 },
      reminderStatus: 'sent'
    });

    const conversionRate = remindersSentCount > 0 
      ? Number(((rebookedCount / remindersSentCount) * 100).toFixed(1)) 
      : 0;

    const marketingDeliveryRate = marketingSent > 0 
      ? Number(((marketingDelivered / marketingSent) * 100).toFixed(1)) 
      : 100;

    res.status(200).json({
      totalCustomers,
      whatsappCustomers,
      remindersSent,
      remindersDelivered,
      remindersRead,
      remindersFailed,
      marketingSent,
      marketingDeliveryRate,
      repeatBookings,
      revenueFromRepeat,
      customerRetentionRate,
      conversionRate,
      rebookedCount,
      remindersSentCount
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Lists customer contacts with search, pagination, and smart targeting filters.
 */
export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, service, company, location, minSpent, inactiveDays, hasReminder, repeatOnly, limit = 100, page = 1 } = req.query;

    const query: any = {};

    // 1. Text Search (name or phone or location)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { serviceLocation: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Filter by service taken
    if (service) {
      query.serviceTaken = { $regex: service, $options: 'i' };
    }

    // 3. Filter by company
    if (company && company !== 'All') {
      query.company = company;
    }

    // 4. Filter by specific location
    if (location) {
      query.serviceLocation = { $regex: location, $options: 'i' };
    }

    // 5. Filter by minimum total spent
    if (minSpent) {
      query.totalAmountSpent = { $gte: Number(minSpent) };
    }

    // 6. Filter by inactivity (in days)
    if (inactiveDays) {
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - Number(inactiveDays));
      query.lastServiceDate = { $lte: cutOff };
    }

    // 7. Filter by Repeat Customers
    if (repeatOnly === 'true') {
      query.totalServicesTaken = { $gt: 1 };
    }

    // 8. Filter by upcoming service reminder status
    if (hasReminder === 'true') {
      query.nextReminderDate = { $exists: true, $ne: null };
      query.reminderStatus = 'pending';
    }

    const itemsLimit = Number(limit);
    const skipCount = (Number(page) - 1) * itemsLimit;

    const customers = await CustomerContact.find(query)
      .sort({ lastServiceDate: -1 })
      .skip(skipCount)
      .limit(itemsLimit);

    const total = await CustomerContact.countDocuments(query);

    res.status(200).json({
      customers,
      total,
      pages: Math.ceil(total / itemsLimit),
      currentPage: Number(page)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Retrieves details of a single customer, including full booking history,
 * scheduled reminders, and WhatsApp communication log.
 */
export const getCustomerDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await CustomerContact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: 'Customer contact not found' });
    }

    // Retrieve full job history for this customer based on phone match
    const jobs = await Job.find({
      clientPhone: contact.phone,
      status: 'completed'
    }).sort({ completedAt: -1 });

    // Retrieve scheduled/previous reminders
    const reminders = await ServiceReminder.find({
      customerId: contact._id
    }).sort({ reminderDate: -1 });

    // Retrieve message history log
    const messages = await WhatsAppMessage.find({
      customerId: contact._id
    }).sort({ sentTime: -1 });

    res.status(200).json({
      contact,
      jobs,
      reminders,
      messages
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Opts a customer in or out of receiving promotional marketing campaigns.
 */
export const updateCustomerOptOut = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { marketingOptOut } = req.body;

    const contact = await CustomerContact.findByIdAndUpdate(
      id,
      { $set: { marketingOptOut: !!marketingOptOut } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Customer contact not found' });
    }

    logAudit(req, {
      action: 'updated',
      entityType: 'CustomerContact',
      entityId: contact._id.toString(),
      summary: `Updated marketing opt-out status for "${contact.name}" to ${contact.marketingOptOut}`
    });

    res.status(200).json({ message: 'Opt-out status updated successfully', contact });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Retrieves lists of reminders grouped by statuses: today's due, overdue, upcoming, sent, and failed.
 */
export const getReminders = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // 1. Overdue: pending and reminderDate before today
    const overdue = await ServiceReminder.find({
      status: 'pending',
      reminderDate: { $lt: todayStart }
    }).populate('customerId').sort({ reminderDate: 1 });

    // 2. Today's: pending and reminderDate is today
    const today = await ServiceReminder.find({
      status: 'pending',
      reminderDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('customerId').sort({ reminderDate: 1 });

    // 3. Upcoming: pending and reminderDate is in future
    const upcoming = await ServiceReminder.find({
      status: 'pending',
      reminderDate: { $gt: todayEnd }
    }).populate('customerId').sort({ reminderDate: 1 });

    // 4. Sent / Logged Reminders
    const sent = await ServiceReminder.find({
      status: 'sent'
    }).populate('customerId').sort({ sentDate: -1 }).limit(100);

    // 5. Failed Reminders
    const failed = await ServiceReminder.find({
      status: 'failed'
    }).populate('customerId').sort({ updatedAt: -1 }).limit(100);

    // 6. Due This Week count
    const dueThisWeekCount = await ServiceReminder.countDocuments({
      status: 'pending',
      reminderDate: { $gte: todayStart, $lte: weekEnd }
    });

    // 7. Due This Month count
    const dueThisMonthCount = await ServiceReminder.countDocuments({
      status: 'pending',
      reminderDate: { $gte: todayStart, $lte: monthEnd }
    });

    res.status(200).json({
      today,
      overdue,
      upcoming,
      sent,
      failed,
      dueThisWeekCount,
      dueThisMonthCount
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Instantly triggers and sends a pending reminder message.
 */
export const sendManualReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const reminder = await ServiceReminder.findById(id).populate('customerId');
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder record not found' });
    }

    const contact = reminder.customerId as any;
    if (!contact) {
      return res.status(400).json({ message: 'Associated customer contact not found' });
    }

    let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings) {
      settings = new WhatsAppSetting({ settingId: 'global' });
      await settings.save();
    }

    // Build template message text
    let messageText = settings.reminderMessageTemplate || '';
    messageText = messageText
      .replace(/{{customer_name}}/g, contact.name)
      .replace(/{{service_name}}/g, reminder.serviceName)
      .replace(/{{last_service_date}}/g, contact.lastServiceDate ? new Date(contact.lastServiceDate).toLocaleDateString() : '')
      .replace(/{{company_name}}/g, contact.company === 'All' ? 'SofaShine' : contact.company)
      .replace(/{{reminder_days}}/g, String(settings.defaultReminderDays));

    const result = await sendWhatsAppMessage(contact.phone, messageText, contact.name, 'reminder', {
      customerId: contact._id,
      reminderId: reminder._id
    });

    if (result.success) {
      contact.reminderStatus = 'sent';
      await contact.save();

      logAudit(req, {
        action: 'sent_reminder',
        entityType: 'ServiceReminder',
        entityId: reminder._id.toString(),
        summary: `Manually triggered and sent service reminder to "${contact.name}"`
      });

      res.status(200).json({ message: 'Reminder message sent successfully', result });
    } else {
      contact.reminderStatus = 'failed';
      await contact.save();
      res.status(400).json({ message: 'Failed to send WhatsApp message', error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Instantly triggers and sends multiple pending reminder messages.
 */
export const sendBulkManualReminders = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No reminder IDs provided.' });
    }

    let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings) {
      settings = new WhatsAppSetting({ settingId: 'global' });
      await settings.save();
    }

    const reminders = await ServiceReminder.find({ _id: { $in: ids } }).populate('customerId');
    let successCount = 0;

    for (const reminder of reminders) {
      const contact = reminder.customerId as any;
      if (!contact) continue;

      // Build template message text
      let messageText = settings.reminderMessageTemplate || '';
      messageText = messageText
        .replace(/{{customer_name}}/g, contact.name)
        .replace(/{{service_name}}/g, reminder.serviceName)
        .replace(/{{last_service_date}}/g, contact.lastServiceDate ? new Date(contact.lastServiceDate).toLocaleDateString() : '')
        .replace(/{{company_name}}/g, contact.company === 'All' ? 'SofaShine' : contact.company)
        .replace(/{{reminder_days}}/g, String(settings.defaultReminderDays));

      const result = await sendWhatsAppMessage(contact.phone, messageText, contact.name, 'reminder', {
        customerId: contact._id,
        reminderId: reminder._id
      });

      if (result.success) {
        contact.reminderStatus = 'sent';
        await contact.save();
        successCount++;
      } else {
        contact.reminderStatus = 'failed';
        await contact.save();
      }
    }

    logAudit(req, {
      action: 'sent_reminders_bulk',
      entityType: 'ServiceReminder',
      entityId: 'bulk',
      summary: `Manually triggered and sent ${successCount} service reminders in bulk.`
    });

    res.status(200).json({ message: `Bulk reminder task complete. Sent ${successCount} successfully out of ${reminders.length}.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Creates and logs a bulk/filtered WhatsApp marketing campaign (sends now or schedules for later).
 */
export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { name, messageText, imageUrl, selectedIds, targetFilters, scheduleTime } = req.body;

    if (!name || !messageText) {
      return res.status(400).json({ message: 'Campaign name and message text are mandatory.' });
    }

    let finalImageUrl = '';
    if (imageUrl) {
      if (imageUrl.startsWith('data:image/')) {
        try {
          finalImageUrl = await uploadToCloudinary(imageUrl, 'whatsapp_campaigns');
        } catch (uploadErr) {
          console.error('Failed to upload campaign image to Cloudinary:', uploadErr);
        }
      } else {
        finalImageUrl = imageUrl;
      }
    }

    const campaign = new WhatsAppCampaign({
      name,
      messageText,
      imageUrl: finalImageUrl,
      status: scheduleTime ? 'scheduled' : 'sent',
      scheduledTime: scheduleTime ? new Date(scheduleTime) : undefined,
      filtersUsed: { selectedIds, targetFilters }
    });

    // If sending immediately
    if (!scheduleTime) {
      let targets: any[] = [];
      if (selectedIds && selectedIds.length > 0) {
        targets = await CustomerContact.find({ _id: { $in: selectedIds }, marketingOptOut: false });
      } else if (targetFilters) {
        const query: any = { marketingOptOut: false };
        if (targetFilters.serviceTaken) {
          query.serviceTaken = { $regex: new RegExp(targetFilters.serviceTaken, 'i') };
        }
        if (targetFilters.company && targetFilters.company !== 'All') {
          query.company = targetFilters.company;
        }
        if (targetFilters.location) {
          query.serviceLocation = { $regex: new RegExp(targetFilters.location, 'i') };
        }
        if (targetFilters.minSpent) {
          query.totalAmountSpent = { $gte: Number(targetFilters.minSpent) };
        }
        if (targetFilters.inactiveDays) {
          const cutOffDate = new Date();
          cutOffDate.setDate(cutOffDate.getDate() - Number(targetFilters.inactiveDays));
          query.lastServiceDate = { $lte: cutOffDate };
        }
        targets = await CustomerContact.find(query);
      }

      let sentCount = 0;
      for (const target of targets) {
        let personalizedMsg = messageText;
        personalizedMsg = personalizedMsg
          .replace(/{{customer_name}}/g, target.name)
          .replace(/{{service_name}}/g, target.serviceTaken || 'our service')
          .replace(/{{last_service_date}}/g, target.lastServiceDate ? new Date(target.lastServiceDate).toLocaleDateString() : '')
          .replace(/{{company_name}}/g, target.company === 'All' ? 'SofaShine' : target.company);

        await sendWhatsAppMessage(target.phone, personalizedMsg, target.name, 'marketing', {
          customerId: target._id,
          campaignId: campaign._id
        }, campaign.imageUrl);
        sentCount++;
      }

      campaign.sentTime = new Date();
      campaign.recipientsCount = sentCount;
      campaign.status = 'sent';
      await campaign.save();

      logAudit(req, {
        action: 'sent_campaign',
        entityType: 'WhatsAppCampaign',
        entityId: campaign._id.toString(),
        summary: `Sent WhatsApp Campaign "${name}" to ${sentCount} recipients.`
      });

      res.status(201).json({ message: 'Campaign sent successfully', campaign });
    } else {
      // Scheduled Campaign
      await campaign.save();

      logAudit(req, {
        action: 'scheduled_campaign',
        entityType: 'WhatsAppCampaign',
        entityId: campaign._id.toString(),
        summary: `Scheduled WhatsApp Campaign "${name}" for ${campaign.scheduledTime}`
      });

      res.status(201).json({ message: 'Campaign scheduled successfully', campaign });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Lists previous/scheduled campaigns.
 */
export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await WhatsAppCampaign.find().sort({ createdAt: -1 });
    res.status(200).json(campaigns);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Returns full message log history.
 */
export const getMessageHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { search, limit = 100, page = 1 } = req.query;

    const query: any = {};
    if (search) {
      query.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { messageText: { $regex: search, $options: 'i' } }
      ];
    }

    const itemsLimit = Number(limit);
    const skipCount = (Number(page) - 1) * itemsLimit;

    const messages = await WhatsAppMessage.find(query)
      .populate('customerId')
      .populate('campaignId')
      .populate('reminderId')
      .sort({ sentTime: -1 })
      .skip(skipCount)
      .limit(itemsLimit);

    const total = await WhatsAppMessage.countDocuments(query);

    res.status(200).json({
      messages,
      total,
      pages: Math.ceil(total / itemsLimit),
      currentPage: Number(page)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Retrieves current WhatsApp module settings.
 */
export const getWhatsAppSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings) {
      settings = new WhatsAppSetting({ settingId: 'global' });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Updates WhatsApp module settings.
 */
export const updateWhatsAppSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { defaultReminderDays, serviceReminderDays, reminderMessageTemplate, marketingMessageTemplate, whatsappApiUrl, whatsappAccessToken, whatsappPhoneNumberId, useMockApi, enableAutoReminders } = req.body;

    const settings = await WhatsAppSetting.findOneAndUpdate(
      { settingId: 'global' },
      {
        $set: {
          defaultReminderDays: Number(defaultReminderDays) || 30,
          serviceReminderDays: Array.isArray(serviceReminderDays) ? serviceReminderDays : [],
          reminderMessageTemplate,
          marketingMessageTemplate,
          whatsappApiUrl,
          whatsappAccessToken,
          whatsappPhoneNumberId,
          useMockApi: !!useMockApi,
          enableAutoReminders: enableAutoReminders !== undefined ? !!enableAutoReminders : true
        }
      },
      { new: true, upsert: true }
    );

    logAudit(req, {
      action: 'updated',
      entityType: 'WhatsAppSetting',
      entityId: settings._id.toString(),
      summary: `Updated global WhatsApp Engagement settings.`
    });

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Triggers manual startup backfill of customer contacts from historic completed jobs.
 */
export const triggerManualBackfill = async (req: AuthRequest, res: Response) => {
  try {
    await backfillCustomerContacts();
    res.status(200).json({ message: 'Customer contact backfill process finished.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Manually adds a customer contact to the database.
 */
export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, alternatePhone, email, company, serviceTaken, lastServiceDate, totalAmountSpent } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Customer Name and WhatsApp Number are required.' });
    }

    // Check if phone number already exists
    let existingContact = await CustomerContact.findOne({ phone });
    if (existingContact) {
      return res.status(400).json({ message: `A customer contact with WhatsApp number ${phone} already exists.` });
    }

    const newContact = new CustomerContact({
      name,
      phone,
      alternatePhone,
      email,
      company: company || 'SofaShine',
      serviceTaken: serviceTaken || 'Manual Entry',
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : new Date(),
      totalAmountSpent: Number(totalAmountSpent) || 0,
      totalServicesTaken: 1
    });

    await newContact.save();

    logAudit(req, {
      action: 'created',
      entityType: 'CustomerContact',
      entityId: newContact._id.toString(),
      summary: `Manually added customer contact "${name}" with phone ${phone}`
    });

    res.status(201).json({ message: 'Customer contact added successfully', contact: newContact });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
