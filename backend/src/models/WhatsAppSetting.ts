import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppSetting extends Document {
  settingId: string; // e.g. 'global'
  defaultReminderDays: number;
  serviceReminderDays: Array<{
    serviceName: string;
    days: number;
  }>;
  reminderMessageTemplate: string;
  marketingMessageTemplate: string;
  whatsappApiUrl?: string;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  useMockApi: boolean;
}

const WhatsAppSettingSchema = new Schema<IWhatsAppSetting>({
  settingId: { type: String, default: 'global', unique: true },
  defaultReminderDays: { type: Number, default: 30 },
  serviceReminderDays: [{
    serviceName: { type: String, required: true },
    days: { type: Number, required: true }
  }],
  reminderMessageTemplate: {
    type: String,
    default: "Hi {{customer_name}} 👋\n\nYou had your {{service_name}} service with {{company_name}} about {{reminder_days}} days ago.\n\nIt's time to refresh your service again! 🛋️✨\n\nWould you like to schedule your next cleaning?\n\nContact us to book your service."
  },
  marketingMessageTemplate: {
    type: String,
    default: "Hi {{customer_name}},\n\nBook {{service_name}} again today and get {{offer}}!"
  },
  whatsappApiUrl: { type: String, default: 'https://graph.facebook.com/v17.0' },
  whatsappAccessToken: { type: String, default: '' },
  whatsappPhoneNumberId: { type: String, default: '' },
  useMockApi: { type: Boolean, default: true } // Defaults to mock API for demonstration and seamless local testing
}, {
  timestamps: true
});

export default mongoose.model<IWhatsAppSetting>('WhatsAppSetting', WhatsAppSettingSchema);
