import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IDPR {
  _id?: string;
  userId: Types.ObjectId | string;
  date: Date;
  content: string;
  summary?: string;
  projectId?: Types.ObjectId | string;
  createdAt?: Date;
}

const DPRSchema = new Schema<IDPR>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  content: { type: String, required: true },
  summary: { type: String },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  createdAt: { type: Date, default: Date.now }
});

const DPR: Model<IDPR> = mongoose.models.DPR || mongoose.model<IDPR>('DPR', DPRSchema);

export default DPR;
