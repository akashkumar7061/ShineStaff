import mongoose from 'mongoose';
import CustomerContact from '../models/CustomerContact';
import ServiceReminder from '../models/ServiceReminder';
import WhatsAppSetting from '../models/WhatsAppSetting';
import WhatsAppMessage from '../models/WhatsAppMessage';
import Job from '../models/Job';

/**
 * Normalizes phone numbers to a consistent clean format (e.g., digits only).
 * If number starts with +, keeps it, but strips whitespace and dashes.
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return cleaned;
};

/**
 * Validates whether a normalized phone number is valid for WhatsApp (basic check).
 */
export const isValidWhatsAppPhone = (phone: string): boolean => {
  const clean = normalizePhone(phone);
  // Must be numeric (optionally starting with +) and at least 8 digits
  return /^\+?\d{8,15}$/.test(clean);
};

/**
 * Core business logic: Sync customer contact details from a completed job,
 * update statistics, and schedule/reschedule the next service reminder.
 */
export const syncCustomerAndScheduleReminder = async (job: any) => {
  try {
    const rawPhone = job.clientPhone;
    if (!rawPhone || !isValidWhatsAppPhone(rawPhone)) {
      console.log(`[WhatsApp Helper] Skipping customer sync for job ${job._id} because phone "${rawPhone}" is invalid for WhatsApp.`);
      return;
    }

    const phone = normalizePhone(rawPhone);
    const completedDate = job.completedAt || new Date();
    const serviceName = job.title || 'Clean Job';
    const amount = job.price || 0;
    const location = job.address || '';
    const alternatePhone = normalizePhone(job.alternatePhone || '');
    const email = job.clientEmail || '';
    const company = job.company || 'All';
    const isCompleted = job.status === 'completed';

    // 1. Get or create WhatsAppSettings
    let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings) {
      settings = new WhatsAppSetting({ settingId: 'global' });
      await settings.save();
    }

    // 2. Fetch or create CustomerContact
    let contact = await CustomerContact.findOne({ phone });
    if (contact) {
      // Re-booking occurred: update information
      contact.name = job.clientName || contact.name;
      contact.alternatePhone = alternatePhone || contact.alternatePhone;
      contact.email = email || contact.email;
      contact.company = company as any;
      contact.serviceLocation = location || contact.serviceLocation;

      // Update statistics and service information ONLY if job is completed
      if (isCompleted) {
        contact.serviceTaken = serviceName;
        contact.lastServiceDate = completedDate;
        contact.lastServiceName = serviceName;
        contact.lastServiceAmount = amount;
        contact.totalServicesTaken += 1;
        contact.totalAmountSpent += amount;
        contact.reminderStatus = 'pending';
      }
    } else {
      // New customer: create contact record
      contact = new CustomerContact({
        name: job.clientName || 'Customer',
        phone,
        alternatePhone,
        email,
        company: company as any,
        serviceTaken: isCompleted ? serviceName : '',
        lastServiceDate: isCompleted ? completedDate : (job.createdAt || new Date()),
        lastServiceName: isCompleted ? serviceName : '',
        lastServiceAmount: isCompleted ? amount : 0,
        serviceLocation: location,
        totalServicesTaken: isCompleted ? 1 : 0,
        totalAmountSpent: isCompleted ? amount : 0,
        reminderStatus: isCompleted ? 'pending' : 'no_reminder',
        marketingOptOut: false
      });
    }

    // 3. ONLY schedule reminder if the job is completed
    if (isCompleted) {
      let reminderDays = settings.defaultReminderDays || 30;
      if (settings.serviceReminderDays && settings.serviceReminderDays.length > 0) {
        const match = settings.serviceReminderDays.find(
          (rule) => rule.serviceName.toLowerCase() === serviceName.toLowerCase()
        );
        if (match) {
          reminderDays = match.days;
        } else {
          // Try substring search (e.g. "Sofa" in "Sofa Cleaning")
          const subMatch = settings.serviceReminderDays.find(
            (rule) => serviceName.toLowerCase().includes(rule.serviceName.toLowerCase()) || 
                      rule.serviceName.toLowerCase().includes(serviceName.toLowerCase())
          );
          if (subMatch) {
            reminderDays = subMatch.days;
          }
        }
      }

      const nextReminder = new Date(completedDate.getTime() + reminderDays * 24 * 60 * 60 * 1000);
      contact.nextReminderDate = nextReminder;
      contact.reminderStatus = 'pending';
      await contact.save();

      // 4. Cancel any previous pending reminders for this customer to prevent duplicate alerts
      await ServiceReminder.updateMany(
        { customerId: contact._id, status: 'pending' },
        { $set: { status: 'cancelled' } }
      );

      // 5. Create new pending Service Reminder
      const reminder = new ServiceReminder({
        customerId: contact._id,
        jobId: job._id,
        serviceName,
        reminderDate: nextReminder,
        status: 'pending'
      });
      await reminder.save();

      console.log(`[WhatsApp Helper] Successfully synced customer contact for "${contact.name}" and scheduled next service reminder for ${nextReminder.toDateString()} (${reminderDays} days interval).`);
    } else {
      // Just save customer details if it's not completed
      await contact.save();
      console.log(`[WhatsApp Helper] Synced customer details for "${contact.name}" (Status: ${job.status}). No reminder scheduled.`);
    }
  } catch (error) {
    console.error('[WhatsApp Helper] Error in syncCustomerAndScheduleReminder:', error);
  }
};

/**
 * Sends a WhatsApp message (either via Cloud API or mocked).
 */
export const sendWhatsAppMessage = async (
  phoneNumber: string,
  messageText: string,
  recipientName: string,
  messageType: 'reminder' | 'marketing',
  relationIds: {
    customerId?: mongoose.Types.ObjectId;
    campaignId?: mongoose.Types.ObjectId;
    reminderId?: mongoose.Types.ObjectId;
  },
  imageUrl?: string
): Promise<any> => {
  try {
    let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings) {
      settings = new WhatsAppSetting({ settingId: 'global' });
      await settings.save();
    }

    const { customerId, campaignId, reminderId } = relationIds;

    // Resolve company-specific WhatsApp credentials based on recipient customer contact
    const contact = await CustomerContact.findOne({ phone: phoneNumber });
    const company = contact ? contact.company : 'All';

    let activePhoneNumberId = settings.whatsappPhoneNumberId;
    let activeAccessToken = settings.whatsappAccessToken;

    if (company === 'SofaShine') {
      activePhoneNumberId = settings.sofaShinePhoneNumberId || settings.whatsappPhoneNumberId;
      activeAccessToken = settings.sofaShineAccessToken || settings.whatsappAccessToken;
    } else if (company === 'CleanCruisers') {
      activePhoneNumberId = settings.cleanCruisersPhoneNumberId || settings.whatsappPhoneNumberId;
      activeAccessToken = settings.cleanCruisersAccessToken || settings.whatsappAccessToken;
    }

    // Simulate sending failure for test numbers ending in 999 or exactly 1234567890
    if (phoneNumber.endsWith('999') || phoneNumber === '1234567890') {
      const errorMsg = 'Failed to send message: recipient phone number is marked for failure simulation.';
      const msg = new WhatsAppMessage({
        customerId,
        campaignId,
        reminderId,
        recipientName,
        phoneNumber,
        messageType,
        messageText,
        imageUrl: imageUrl || '',
        status: 'failed',
        sentTime: new Date(),
        errorDetails: errorMsg
      });
      await msg.save();

      if (reminderId) {
        await ServiceReminder.findByIdAndUpdate(reminderId, {
          status: 'failed',
          sentDate: new Date(),
          errorMessage: errorMsg,
          messageText
        });
      }
      return { success: false, error: errorMsg };
    }

    if (settings.useMockApi) {
      // Mock API flow
      console.log(`[WhatsApp Mock API] Sending ${messageType} to ${recipientName} (${phoneNumber}) using company "${company}" credentials (Phone ID: ${activePhoneNumberId}):\n"${messageText}"`);

      const msg = new WhatsAppMessage({
        customerId,
        campaignId,
        reminderId,
        recipientName,
        phoneNumber,
        messageType,
        messageText,
        imageUrl: imageUrl || '',
        status: 'sent', // Will be transitioned to delivered/read by worker
        sentTime: new Date()
      });
      await msg.save();

      if (reminderId) {
        await ServiceReminder.findByIdAndUpdate(reminderId, {
          status: 'sent',
          sentDate: new Date(),
          messageText
        });
      }

      return { success: true, messageId: msg._id };
    } else {
      // Live WhatsApp Cloud API flow (Meta Graph API)
      if (!activePhoneNumberId || !activeAccessToken) {
        throw new Error(`WhatsApp credentials (Phone Number ID or Access Token) are missing in settings for company "${company}".`);
      }

      console.log(`[WhatsApp Helper] Sending live API message to ${phoneNumber} using "${company}" credentials (Phone ID: ${activePhoneNumberId}).`);
      const url = `${settings.whatsappApiUrl}/${activePhoneNumberId}/messages`;
      
      let payload: any;
      if (imageUrl) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber,
          type: 'image',
          image: {
            link: imageUrl,
            caption: messageText
          }
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText
          }
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data.error?.message || 'WhatsApp Cloud API request failed');
      }

      const msg = new WhatsAppMessage({
        customerId,
        campaignId,
        reminderId,
        recipientName,
        phoneNumber,
        messageType,
        messageText,
        imageUrl: imageUrl || '',
        status: 'sent',
        sentTime: new Date()
      });
      await msg.save();

      if (reminderId) {
        await ServiceReminder.findByIdAndUpdate(reminderId, {
          status: 'sent',
          sentDate: new Date(),
          messageText
        });
      }

      return { success: true, response: data, messageId: msg._id };
    }
  } catch (err: any) {
    console.error('[WhatsApp Helper] Error in sendWhatsAppMessage:', err.message);
    const errorMsg = err.message || 'Unknown sending error';

    const failedMsg = new WhatsAppMessage({
      customerId: relationIds.customerId,
      campaignId: relationIds.campaignId,
      reminderId: relationIds.reminderId,
      recipientName,
      phoneNumber,
      messageType,
      messageText,
      imageUrl: imageUrl || '',
      status: 'failed',
      sentTime: new Date(),
      errorDetails: errorMsg
    });
    await failedMsg.save();

    if (relationIds.reminderId) {
      await ServiceReminder.findByIdAndUpdate(relationIds.reminderId, {
        status: 'failed',
        sentDate: new Date(),
        errorMessage: errorMsg,
        messageText
      });
    }

    return { success: false, error: errorMsg };
  }
};

/**
 * Startup task: Iterates over all historic jobs and builds the CustomerContact database.
 */
export const backfillCustomerContacts = async () => {
  try {
    const totalContacts = await CustomerContact.countDocuments();
    if (totalContacts > 0) {
      console.log(`[WhatsApp Helper] Customer contacts database already has ${totalContacts} records. Skipping startup backfill.`);
      return;
    }

    console.log('[WhatsApp Helper] Starting startup backfill of customer contacts from all historical jobs...');
    const allJobs = await Job.find({}).sort({ createdAt: 1 });
    console.log(`[WhatsApp Helper] Found ${allJobs.length} total jobs to process.`);

    let count = 0;
    for (const job of allJobs) {
      if (job.clientPhone && isValidWhatsAppPhone(job.clientPhone)) {
        await syncCustomerAndScheduleReminder(job);
        count++;
      }
    }
    console.log(`[WhatsApp Helper] Completed startup backfill. Sync-completed for ${count} jobs successfully.`);
  } catch (error) {
    console.error('[WhatsApp Helper] Error during customer contacts backfill:', error);
  }
};
