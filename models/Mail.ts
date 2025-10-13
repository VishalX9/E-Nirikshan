import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IMail {
  _id?: string;
  from: Types.ObjectId | string;
  to: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed';
  error?: string;
  createdAt?: Date;
}

const MailSchema = new Schema<IMail>({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Mail: Model<IMail> = mongoose.models.Mail || mongoose.model<IMail>('Mail', MailSchema);

export default Mail;
