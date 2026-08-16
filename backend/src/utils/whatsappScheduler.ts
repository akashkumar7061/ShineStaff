import ServiceReminder from '../models/ServiceReminder';
import WhatsAppCampaign from '../models/WhatsAppCampaign';
import WhatsAppMessage from '../models/WhatsAppMessage';
import CustomerContact from '../models/CustomerContact';
import WhatsAppSetting from '../models/WhatsAppSetting';
import { sendWhatsAppMessage } from './whatsappHelper';

/**
 * Executes all pending service reminders and scheduled marketing campaigns whose time has come.
 */
export const runScheduledTasks = async () => {
  try {
    const now = new Date();

    // 1. Process Due Service Reminders
    const reminders = await ServiceReminder.find({
      status: 'pending',
      reminderDate: { $lte: now }
    }).populate('customerId');

    if (reminders.length > 0) {
      console.log(`[WhatsApp Scheduler] Found ${reminders.length} due service reminders.`);
      let settings = await WhatsAppSetting.findOne({ settingId: 'global' });
      if (!settings) {
        settings = new WhatsAppSetting({ settingId: 'global' });
        await settings.save();
      }

      for (const reminder of reminders) {
        const contact = reminder.customerId as any;
        if (!contact) continue;

        // Populate dynamic variables in reminder template
        let messageText = settings.reminderMessageTemplate || '';
        messageText = messageText
          .replace(/{{customer_name}}/g, contact.name)
          .replace(/{{service_name}}/g, reminder.serviceName)
          .replace(/{{last_service_date}}/g, contact.lastServiceDate ? new Date(contact.lastServiceDate).toLocaleDateString() : '')
          .replace(/{{company_name}}/g, contact.company === 'All' ? 'SofaShine' : contact.company)
          .replace(/{{reminder_days}}/g, String(settings.defaultReminderDays));

        const res = await sendWhatsAppMessage(contact.phone, messageText, contact.name, 'reminder', {
          customerId: contact._id,
          reminderId: reminder._id
        });

        if (res.success) {
          contact.reminderStatus = 'sent';
        } else {
          contact.reminderStatus = 'failed';
        }
        await contact.save();
      }
    }

    // 2. Process Due Marketing Campaigns
    const campaigns = await WhatsAppCampaign.find({
      status: 'scheduled',
      scheduledTime: { $lte: now }
    });

    if (campaigns.length > 0) {
      console.log(`[WhatsApp Scheduler] Found ${campaigns.length} scheduled campaigns ready to execute.`);
      for (const campaign of campaigns) {
        const filters = (campaign.filtersUsed || {}) as any;
        const { selectedIds, targetFilters } = filters;

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
          let message = campaign.messageText;
          message = message
            .replace(/{{customer_name}}/g, target.name)
            .replace(/{{service_name}}/g, target.serviceTaken || 'our service')
            .replace(/{{last_service_date}}/g, target.lastServiceDate ? new Date(target.lastServiceDate).toLocaleDateString() : '')
            .replace(/{{company_name}}/g, target.company === 'All' ? 'SofaShine' : target.company);

          await sendWhatsAppMessage(target.phone, message, target.name, 'marketing', {
            customerId: target._id,
            campaignId: campaign._id
          });
          sentCount++;
        }

        campaign.status = 'sent';
        campaign.sentTime = new Date();
        campaign.recipientsCount = sentCount;
        await campaign.save();
      }
    }
  } catch (error) {
    console.error('[WhatsApp Scheduler] Error in runScheduledTasks:', error);
  }
};

/**
 * Progression simulator for mock WhatsApp API:
 * Sent -> Delivered (after 5s) -> Read (after 10s)
 */
export const simulateWhatsAppStatusUpdates = async () => {
  try {
    const settings = await WhatsAppSetting.findOne({ settingId: 'global' });
    if (!settings || !settings.useMockApi) return;

    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const tenSecondsAgo = new Date(Date.now() - 10000);

    // 1. Sent -> Delivered
    await WhatsAppMessage.updateMany(
      { status: 'sent', createdAt: { $lte: fiveSecondsAgo } },
      { $set: { status: 'delivered' } }
    );

    // 2. Delivered -> Read
    await WhatsAppMessage.updateMany(
      { status: 'delivered', updatedAt: { $lte: tenSecondsAgo } },
      { $set: { status: 'read' } }
    );
  } catch (error) {
    console.error('[WhatsApp Scheduler] Error in simulateWhatsAppStatusUpdates:', error);
  }
};
