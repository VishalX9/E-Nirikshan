import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IProject {
  _id?: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'in-review';
  assignedTo: (Types.ObjectId | string)[];
  tasks: {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'in-review' | 'completed' | 'done';
    assignedTo: Types.ObjectId | string;
  }[];
  archived?: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId | string;
  createdAt?: Date;
  department?: string;
  tags?: string[];
  complexity?: 'Low' | 'Medium' | 'High';
  duration?: number;
  budget?: number;
  fieldInvolvement?: number;
  hqInvolvement?: number;
  expectedDeliverables?: string;
  kpiWeights?: {
    [kpiName: string]: {
      fieldWeight: number;
      hqWeight: number;
    };
  };
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'on-hold', 'in-review'], default: 'active' },
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  tasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'in-progress', 'in-review', 'completed', 'done'], default: 'todo' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  department: { type: String },
  tags: [{ type: String }],
  complexity: { type: String, enum: ['Low', 'Medium', 'High'] },
  duration: { type: Number },
  budget: { type: Number },
  fieldInvolvement: { type: Number, min: 0, max: 100 },
  hqInvolvement: { type: Number, min: 0, max: 100 },
  expectedDeliverables: { type: String },
  kpiWeights: { type: Schema.Types.Mixed }
});

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
