import mongoose, { Schema, Model, Types } from 'mongoose';

export interface INotification {
  _id?: string;
  user: Types.ObjectId | string;
  message: string;
  read: boolean;
  type: 'kpi' | 'apar' | 'mail' | 'system';
  relatedId?: Types.ObjectId | string;
  createdAt?: Date;
}

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['kpi', 'apar', 'mail', 'system'], required: true },
  relatedId: { type: Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now }
});

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
