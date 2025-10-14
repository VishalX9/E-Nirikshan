import { type NextRequest, NextResponse } from "next/server"
import { verify } from "jsonwebtoken"
import dbConnect from "@/utils/db"
import Kpi from "@/models/KPI"
import KpiSummary from "@/models/KpiSummary"
import APAR from "@/models/APAR"

// ==================== INTERFACES ====================

interface DPRData {
  totalDprs: number
  totalPages: number
  totalDefects: number
  plannedDays: number
  actualDays: number
  approvedFirstCycle: number
}

interface SurveyData {
  rmseObserved: number
  rmseTolerance: number
}

interface ScheduleData {
  milestonesMet: number
  milestonesDue: number
}

interface BudgetData {
  actualSpend: number
  plannedSpend: number
  tolerance?: number
}

interface ProgressData {
  actualProgress: number
  plannedProgress: number
}

interface ComplianceData {
  checksPassed: number
  checksTotal: number
}

interface HQFileData {
  filesDisposed: number
  totalFiles: number
  periodDays: number
}

interface HQTATData {
  closureDates: Date[]
  receiptDates: Date[]
}

interface HQResponsivenessData {
  actionsWithinSLA: number
  totalActions: number
}

interface HQDraftingData {
  totalDrafts: number
  returnsReopens: number
}

interface HQDigitalData {
  eFileUsage: number
  eSignUsage: number
  eMovementUsage: number
  totalTransactions: number
}

interface JWTPayload {
  userId: string
  email: string
  role: string
}

// ==================== FIELD EMPLOYEE KPI CALCULATIONS ====================

class FieldKPICalculator {
  static calculateDPRTimeliness(data: DPRData): number {
    if (data.actualDays === 0) return 100
    const timelinessRatio = data.plannedDays / data.actualDays
    return Math.min(100, 100 * timelinessRatio)
  }

  static calculateDPRQuality(data: DPRData, qualityThreshold = 5): number {
    if (data.totalPages === 0) return 100
    const defectsPer100Pages = (data.totalDefects / data.totalPages) * 100
    const score = Math.max(0, 100 - (defectsPer100Pages / qualityThreshold) * 100)
    return Math.min(100, Math.max(0, score))
  }

  static calculateSurveyAccuracy(data: SurveyData): number {
    if (data.rmseTolerance === 0) return 100
    const accuracy = 1 - data.rmseObserved / data.rmseTolerance
    return Math.min(100, Math.max(0, 100 * accuracy))
  }

  static calculateScheduleAdherence(data: ScheduleData): number {
    if (data.milestonesDue === 0) return 100
    const onTimePercent = (data.milestonesMet / data.milestonesDue) * 100
    return Math.min(100, onTimePercent)
  }

  static calculateBudgetVariance(data: BudgetData): number {
    if (data.plannedSpend === 0) return 100
    const variancePercent = (Math.abs(data.actualSpend - data.plannedSpend) / data.plannedSpend) * 100

    if (data.tolerance) {
      const score = Math.max(0, 100 - (variancePercent / data.tolerance) * 100)
      return Math.min(100, score)
    }

    return Math.max(0, 100 - variancePercent)
  }

  static calculatePhysicalProgress(data: ProgressData): number {
    if (data.plannedProgress === 0) return 100
    const progressRatio = data.actualProgress / data.plannedProgress
    return Math.min(100, 100 * progressRatio)
  }

  static calculateStandardsCompliance(data: ComplianceData): number {
    if (data.checksTotal === 0) return 100
    const compliancePercent = (data.checksPassed / data.checksTotal) * 100
    return Math.min(100, compliancePercent)
  }

  static calculateFirstPassApproval(data: DPRData): number {
    if (data.totalDprs === 0) return 100
    const firstPassPercent = (data.approvedFirstCycle / data.totalDprs) * 100
    return Math.min(100, firstPassPercent)
  }
}

// ==================== HQ EMPLOYEE KPI CALCULATIONS ====================

class HQKPICalculator {
  static calculateFileDisposalRate(data: HQFileData, targetRate: number): number {
    const disposalRate = data.filesDisposed / data.periodDays
    const achievementPercent = (disposalRate / targetRate) * 100
    return Math.min(100, achievementPercent)
  }

  static calculateMedianTAT(data: HQTATData, targetTAT: number): number {
    if (data.closureDates.length !== data.receiptDates.length || data.closureDates.length === 0) {
      return 0
    }

    const tatDays = data.closureDates.map((closeDate, idx) => {
      const receiptDate = data.receiptDates[idx]
      const diffTime = closeDate.getTime() - receiptDate.getTime()
      return Math.abs(diffTime / (1000 * 60 * 60 * 24))
    })

    tatDays.sort((a, b) => a - b)
    const mid = Math.floor(tatDays.length / 2)
    const medianTAT = tatDays.length % 2 === 0 ? (tatDays[mid - 1] + tatDays[mid]) / 2 : tatDays[mid]

    if (medianTAT === 0) return 100
    const score = Math.max(0, 100 - ((medianTAT - targetTAT) / targetTAT) * 100)
    return Math.min(100, score)
  }

  static calculateResponsiveness(data: HQResponsivenessData): number {
    if (data.totalActions === 0) return 100
    const responsivenessPercent = (data.actionsWithinSLA / data.totalActions) * 100
    return Math.min(100, responsivenessPercent)
  }

  static calculateDraftingQuality(data: HQDraftingData, threshold = 5): number {
    if (data.totalDrafts === 0) return 100
    const returnsPer100 = (data.returnsReopens / data.totalDrafts) * 100
    const score = Math.max(0, 100 - (returnsPer100 / threshold) * 100)
    return Math.min(100, score)
  }

  static calculateDigitalAdoption(data: HQDigitalData): number {
    if (data.totalTransactions === 0) return 0

    const eFilePercent = (data.eFileUsage / data.totalTransactions) * 100
    const eSignPercent = (data.eSignUsage / data.totalTransactions) * 100
    const eMovementPercent = (data.eMovementUsage / data.totalTransactions) * 100

    const averageAdoption = (eFilePercent + eSignPercent + eMovementPercent) / 3
    return Math.min(100, averageAdoption)
  }
}

// ==================== API ROUTE HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    let decoded: JWTPayload
    try {
      decoded = verify(token, process.env.SESSION_SECRET || "your-secret-key") as JWTPayload
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await dbConnect()

    const url = new URL(request.url)
    const requestedUserId = url.searchParams.get("userId")
    // allow admin to query by userId, others see own summary
    const targetUserId = decoded.role === "admin" && requestedUserId ? requestedUserId : decoded.userId

    // 1) Try persisted summary
    const summary = await KpiSummary.findOne({ userId: targetUserId }).sort({ computedAt: -1 })

    // 2) Always fetch KPIs to build a deterministic breakdown (no randomness)
    const userKpis = await Kpi.find({ assignedTo: targetUserId })
    const breakdown: Record<string, number> = {}
    let totalWeightedScore = 0
    let totalWeightage = 0

    for (const k of userKpis) {
      // score in model is already weighted (set during analyze)
      const weighted = typeof k.score === "number" ? k.score : 0
      breakdown[k.kpiName] = Number(weighted.toFixed(2))
      totalWeightedScore += weighted
      totalWeightage += typeof k.weightage === "number" ? k.weightage : 0
    }

    // 3) Latest APAR -> behaviouralScore (0–30) from reviewerScore
    const latestApar = await APAR.findOne({
      $or: [{ employee: targetUserId }, { userId: targetUserId }],
      status: { $in: ["reviewed", "finalized"] },
    }).sort({ createdAt: -1 })

    const behaviouralScore =
      latestApar && typeof latestApar.reviewerScore === "number"
        ? Math.max(0, Math.min(30, latestApar.reviewerScore))
        : 0

    if (summary) {
      const outputScore =
        typeof summary.outputScore === "number"
          ? summary.outputScore
          : totalWeightage > 0
            ? (totalWeightedScore / totalWeightage) * 70
            : 0
      const totalScore = outputScore + behaviouralScore

      return NextResponse.json({
        success: true,
        outputScore: Number(outputScore.toFixed(2)), // out of 70
        behaviouralScore: Number(behaviouralScore.toFixed(2)), // out of 30
        totalScore: Number(totalScore.toFixed(2)), // out of 100
        breakdown,
        metadata: {
          userId: targetUserId,
          role: decoded.role,
          analyzed: true,
          analyzedAt: summary.computedAt?.toISOString() || new Date().toISOString(),
        },
      })
    }

    // No summary yet: return derived KPI output + latest APAR behavioural
    const derivedOutput = totalWeightage > 0 ? (totalWeightedScore / totalWeightage) * 70 : 0
    const totalScore = derivedOutput + behaviouralScore
    return NextResponse.json({
      success: true,
      outputScore: Number(derivedOutput.toFixed(2)),
      behaviouralScore: Number(behaviouralScore.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      breakdown,
      metadata: {
        userId: targetUserId,
        role: decoded.role,
        analyzed: false,
      },
    })
  } catch (error) {
    console.error("Error calculating scores:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
