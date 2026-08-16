import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppCampaign extends Document {
  name: string;
  messageText: string;
  imageUrl?: string;
  recipientsCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledTime?: Date;
  sentTime?: Date;
  filtersUsed?: Schema.Types.Mixed;
}

const WhatsAppCampaignSchema = new Schema<IWhatsAppCampaign>({
  name: { type: String, required: true },
  messageText: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  recipientsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'scheduled', 'sent', 'failed'], default: 'draft' },
  scheduledTime: { type: Date },
  sentTime: { type: Date },
  filtersUsed: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

export default mongoose.model<IWhatsAppCampaign>('WhatsAppCampaign', WhatsAppCampaignSchema);
