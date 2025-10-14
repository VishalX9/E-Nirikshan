import { NextResponse } from "next/server"
import dbConnect from "@/utils/db"
import Apar from "@/models/APAR"
import { authenticate, type AuthRequest } from "@/middleware/auth"

async function getHandler(request: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    await dbConnect()

    const apar = await Apar.findById(params.id)
      .populate("employee", "name email department position")
      .populate("userId", "name email department position")
      .populate("reviewer", "name email position")

    if (!apar) {
      return NextResponse.json(
        {
          success: false,
          error: "APAR not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: apar,
    })
  } catch (error: any) {
    console.error(`Error fetching APAR ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch APAR",
      },
      { status: 500 },
    )
  }
}

async function patchHandler(request: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    await dbConnect()

    const body = await request.json()
    const { selfAppraisal, reviewer, reviewerComments, reviewerScore, status } = body

    // Get existing APAR
    const existing = await Apar.findById(params.id)
    if (!existing) {
      return NextResponse.json({ success: false, error: "APAR not found" }, { status: 404 })
    }

    const updateData: any = {}
    const isAdmin = request.user?.role === "admin"
    const isOwner =
      existing.employee.toString() === request.user?.userId || existing.userId?.toString() === request.user?.userId

    // Permission checks based on status and role
    if (existing.status === "draft") {
      // Draft APARs: Employee can edit their own, admin can edit any
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "You do not have permission to edit this APAR",
          },
          { status: 403 },
        )
      }

      // Employees can only update selfAppraisal and submit (change status to 'submitted')
      if (isOwner && !isAdmin) {
        if (selfAppraisal) {
          updateData.selfAppraisal = selfAppraisal
        }
        if (status === "submitted") {
          updateData.status = status
        }
        // Ignore other fields for non-admin owners
      } else if (isAdmin) {
        // Admins can update everything
        if (selfAppraisal) {
          updateData.selfAppraisal = selfAppraisal
        }
        if (reviewer) {
          updateData.reviewer = reviewer
        }
        if (reviewerComments !== undefined) {
          updateData.reviewerComments = reviewerComments
        }
        if (reviewerScore !== undefined) {
          updateData.reviewerScore = reviewerScore
        }
        if (status) {
          updateData.status = status
        }
      }
    } else if (existing.status === "submitted") {
      // Submitted APARs: Only admin/reviewer can update
      if (!isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "Only reviewers can modify submitted APARs",
          },
          { status: 403 },
        )
      }

      // Admin can review and finalize
      if (reviewer) {
        updateData.reviewer = reviewer
      }
      if (reviewerComments !== undefined) {
        updateData.reviewerComments = reviewerComments
      }
      if (reviewerScore !== undefined) {
        updateData.reviewerScore = reviewerScore
      }
      if (status) {
        updateData.status = status
      }
    } else {
      // Finalized/Reviewed APARs: Only admin can modify
      if (!isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "Finalized APARs can only be modified by administrators",
          },
          { status: 403 },
        )
      }

      // Admin can update everything
      if (selfAppraisal) {
        updateData.selfAppraisal = selfAppraisal
      }
      if (reviewer) {
        updateData.reviewer = reviewer
      }
      if (reviewerComments !== undefined) {
        updateData.reviewerComments = reviewerComments
      }
      if (reviewerScore !== undefined) {
        updateData.reviewerScore = reviewerScore
      }
      if (status) {
        updateData.status = status
      }
    }

    // Recalculate final score when finalizing or reviewing
    if (status === "finalized" || status === "reviewed") {
      const KpiModel = (await import("@/models/KPI")).default
      const kpis = await KpiModel.find({
        assignedTo: existing.employee,
        status: { $in: ["completed", "Completed"] },
      })

      let final = typeof reviewerScore === "number" ? reviewerScore : existing.reviewerScore
      final = Math.max(0, Math.min(30, final)) // behavioural max 30

      if (kpis.length > 0) {
        const totalWeighted = kpis.reduce((sum: number, k: any) => sum + (typeof k.score === "number" ? k.score : 0), 0)
        const totalWt = kpis.reduce(
          (sum: number, k: any) => sum + (typeof k.weightage === "number" ? k.weightage : 0),
          0,
        )
        const output70 = totalWt > 0 ? (totalWeighted / totalWt) * 70 : 0
        updateData.finalScore = output70 + final
      } else {
        updateData.finalScore = final
      }

      if (status === "finalized") {
        await Apar.deleteMany({
          _id: { $ne: params.id },
          $or: [{ employee: existing.employee }, { userId: existing.employee }],
        })
      }
    }

    const updatedApar = await Apar.findByIdAndUpdate(params.id, updateData, { new: true, runValidators: true })
      .populate("employee", "name email department position")
      .populate("userId", "name email department position")
      .populate("reviewer", "name email position")

    if (!updatedApar) {
      return NextResponse.json(
        {
          success: false,
          error: "APAR not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedApar,
    })
  } catch (error: any) {
    console.error(`Error updating APAR ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update APAR",
      },
      { status: 500 },
    )
  }
}

async function putHandler(request: AuthRequest, context: { params: Promise<{ id: string }> }) {
  return patchHandler(request, context)
}

export const GET = authenticate(getHandler)
export const PATCH = authenticate(patchHandler)
export const PUT = authenticate(putHandler)
