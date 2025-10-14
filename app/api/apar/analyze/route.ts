import { NextResponse } from "next/server"
import { authenticate, type AuthRequest } from "@/middleware/auth"
import dbConnect from "@/utils/db"
import APAR from "@/models/APAR"

export const POST = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const { employeeId, year, eofficeScore } = body

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    if (!eofficeScore || typeof eofficeScore !== 'number') {
      return NextResponse.json({ error: "E-office score is required" }, { status: 400 })
    }

    // Calculate 30% of the random APAR score
    const aparScore30Percent = (eofficeScore * 30) / 100

    const currentYear = year || new Date().getFullYear()

    // Find or create APAR
    let apar = await APAR.findOne({ employee: employeeId, year: currentYear })

    if (!apar) {
      apar = await APAR.create({
        employee: employeeId,
        year: currentYear,
        selfAppraisal: { achievements: "", challenges: "", innovations: "" },
        reviewerScore: eofficeScore, // Store the original random score (70-100)
        finalScore: eofficeScore, // Store the original score
        status: "reviewed",
        reviewer: req.user?.userId,
      })
    } else {
      apar.reviewerScore = eofficeScore
      apar.finalScore = eofficeScore
      apar.status = "reviewed"
      apar.reviewer = req.user?.userId as any
      await apar.save()
    }

    // Populate the APAR with employee details
    await apar.populate("employee", "name email department position")

    return NextResponse.json({
      success: true,
      data: {
        totalAparScore: eofficeScore, // Original score (70-100)
        aparScore30Percent: Number(aparScore30Percent.toFixed(2)), // 30% weighted score
        apar: apar.toObject(),
      }
    })
  } catch (error: any) {
    console.error("Error analyzing APAR:", error)
    return NextResponse.json({ error: error.message || "Failed to analyze APAR" }, { status: 500 })
  }
})
