import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for the KPI document
export interface IKpi extends Document {
  title: string;
  kpiName: string;
  metric: string;
  description?: string;
  target: number;
  weightage: number;
  achievedValue: number;
  score: number;
  period: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk' | 'Pending' | 'In Progress' | 'Completed';
  progress: number;
  deadline?: Date;
  role?: 'admin' | 'employee';
  employerType?: 'Field' | 'HQ';
  progressNotes?: string;
  qualitativeScore?: number;
  supervisorComments?: string;
  remarks?: string;
  assignedTo: mongoose.Schema.Types.ObjectId;
  assignedBy?: mongoose.Schema.Types.ObjectId;
  lastUpdated?: Date;
  isDefault?: boolean;
  source?: 'e-office' | 'manual';
  readOnly?: boolean;
  pendingUpdate?: {
    achievedValue: number;
    status: string;
    progressNotes?: string;
    submittedAt: Date;
  };
  projectId?: mongoose.Schema.Types.ObjectId;
  projectName?: string;
  isProjectSpecific?: boolean;
  originalWeightage?: number;
  verifiedBy?: mongoose.Schema.Types.ObjectId;
  verifiedAt?: Date;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  eofficeScore?: number;
}

const KpiSchema: Schema<IKpi> = new Schema({
    projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false,
  },
  
  projectName: {
    type: String,
    required: false,

  },
  
  isProjectSpecific: {
    type: Boolean,
    default: false,
  },
  
  originalWeightage: {
    type: Number,
    required: false,

  },
  title: { type: String },
  kpiName: { type: String, required: true },
  metric: { type: String, required: true },
  description: String,
  target: { type: Number, required: true, default: 0 },
  weightage: { type: Number, required: true, default: 10, min: 0, max: 100 },
  achievedValue: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  period: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'completed', 'at_risk', 'Pending', 'In Progress', 'Completed'], 
    default: 'not_started' 
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  deadline: { type: Date },
  role: { type: String, enum: ['admin', 'employee'] },
  employerType: { type: String, enum: ['Field', 'HQ'] },
  progressNotes: String,
  qualitativeScore: Number,
  supervisorComments: String,
  remarks: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdated: Date,
  isDefault: { type: Boolean, default: false },
  source: { type: String, enum: ['e-office', 'manual'], default: 'e-office' },
  readOnly: { type: Boolean, default: false },
  pendingUpdate: {
    type: {
      achievedValue: { type: Number, required: true },
      status: { type: String, required: true },
      progressNotes: String,
      submittedAt: { type: Date, default: Date.now }
    },
    required: false
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  eofficeScore: { type: Number }
},

 { timestamps: true });

// Mongoose middleware to automatically calculate score and progress
KpiSchema.pre<IKpi>('save', function (next) {
  if (this.isModified('achievedValue') || this.isModified('target') || this.isModified('weightage')) {
    if (this.target > 0) {
      // Calculate progress percentage
      const progressPercent = Math.min((this.achievedValue / this.target) * 100, 100);
      this.progress = progressPercent;
      
      // Calculate score as: (progress / 100) * weightage
      this.score = (progressPercent / 100) * this.weightage;
    } else {
      this.progress = 0;
      this.score = 0;
    }
  }
  
  // Set title to kpiName if not provided
  if (!this.title) {
    this.title = this.kpiName;
  }
  
  next();
});

const Kpi: Model<IKpi> = mongoose.models.Kpi || mongoose.model<IKpi>('Kpi', KpiSchema);

export default Kpi;
