import mongoose, { type Document, Schema, type Model } from "mongoose"

export interface IKpiSummary extends Document {
  userId: mongoose.Types.ObjectId
  period: string
  outputScore: number // out of 70
  computedAt: Date
}

const KpiSummarySchema = new Schema<IKpiSummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    period: { type: String, default: "Annual" },
    outputScore: { type: Number, required: true, default: 0 },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

KpiSummarySchema.index({ userId: 1, period: 1 }, { unique: true })

const KpiSummary: Model<IKpiSummary> =
  mongoose.models.KpiSummary || mongoose.model<IKpiSummary>("KpiSummary", KpiSummarySchema)

export default KpiSummary
