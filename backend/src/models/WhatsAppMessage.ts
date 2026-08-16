import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  customerId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  reminderId?: mongoose.Types.ObjectId;
  recipientName: string;
  phoneNumber: string;
  messageType: 'reminder' | 'marketing';
  serviceName?: string;
  messageText: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentTime: Date;
  errorDetails?: string;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>({
  customerId: { type: Schema.Types.ObjectId, ref: 'CustomerContact' },
  campaignId: { type: Schema.Types.ObjectId, ref: 'WhatsAppCampaign' },
  reminderId: { type: Schema.Types.ObjectId, ref: 'ServiceReminder' },
  recipientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  messageType: { type: String, enum: ['reminder', 'marketing'], required: true },
  serviceName: { type: String, default: '' },
  messageText: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'read', 'failed'], default: 'pending' },
  sentTime: { type: Date, default: Date.now },
  errorDetails: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);
