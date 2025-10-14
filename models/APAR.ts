import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IAPAR {
  _id?: string;
  employee: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  year: number;
  period?: string;
  selfAppraisal: {
    achievements: string;
    challenges: string;
    innovations: string;
  };
  achievements?: string;
  challenges?: string;
  goals?: string;
  draft?: string;
  reviewer?: Types.ObjectId | string;
  reviewerComments?: string;
  reviewerScore: number;
  finalScore: number;
  status: 'draft' | 'submitted' | 'reviewed' | 'finalized';
  createdAt?: Date;
}

const APARSchema = new Schema<IAPAR>({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  year: { type: Number, required: true },
  period: { type: String },
  selfAppraisal: {
    achievements: { type: String, default: '' },
    challenges: { type: String, default: '' },
    innovations: { type: String, default: '' }
  },
  achievements: { type: String },
  challenges: { type: String },
  goals: { type: String },
  draft: { type: String },
  reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewerComments: { type: String },
  reviewerScore: { type: Number, default: 0 },
  finalScore: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'submitted', 'reviewed', 'finalized'], default: 'draft' },
  createdAt: { type: Date, default: Date.now }
});

const APAR: Model<IAPAR> = mongoose.models.APAR || mongoose.model<IAPAR>('APAR', APARSchema);

export default APAR;
