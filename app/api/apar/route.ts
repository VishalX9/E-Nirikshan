import { NextResponse } from "next/server"
import dbConnect from "@/utils/db"
import Apar from "@/models/APAR"
import Kpi from "@/models/KPI"
import { authenticate, type AuthRequest } from "@/middleware/auth"

async function getHandler(request: AuthRequest) {
  try {
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get("employeeId")
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const year = searchParams.get("year")

    const query: any = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (userId) {
      query.$or = [{ employee: userId }, { userId: userId }]
    }

    if (status) {
      query.status = status
    }

    if (year) {
      query.year = Number.parseInt(year)
    }

    let apars = await Apar.find(query)
      .populate("employee", "name email department position")
      .populate("userId", "name email department position")
      .populate("reviewer", "name email position")
      .sort({ createdAt: -1 })

    if (request.user?.role !== "admin") {
      apars = apars.filter((apar: any) => {
        if (apar.status === "finalized") {
          const employeeId = apar.employee?._id?.toString() || apar.userId?._id?.toString()
          return employeeId === request.user?.userId
        }
        return true
      })
    }

    const transformedApars = apars.map((apar: any) => {
      const aparObj = apar.toObject()
      if (!aparObj.employee || typeof aparObj.employee === "string" || aparObj.employee._id === undefined) {
        console.warn(`APAR ${aparObj._id} has missing or unpopulated employee data. Employee ID: ${aparObj.employee}`)
        aparObj.employee = null
      }
      if (aparObj.userId && (typeof aparObj.userId === "string" || aparObj.userId._id === undefined)) {
        aparObj.userId = null
      }
      if (aparObj.reviewer && (typeof aparObj.reviewer === "string" || aparObj.reviewer._id === undefined)) {
        console.warn(`APAR ${aparObj._id} has unpopulated reviewer data. Reviewer ID: ${aparObj.reviewer}`)
        aparObj.reviewer = null
      }
      return aparObj
    })

    // Cleanup orphan APAR entries for admin and filter them from response
    let responseApars = transformedApars
    if (request.user?.role === "admin") {
      const orphanIds = transformedApars
        .filter((a: any) => a.employee === null)
        .map((a: any) => a._id?.toString())
        .filter(Boolean)

      if (orphanIds.length > 0) {
        try {
          await Apar.deleteMany({ _id: { $in: orphanIds } })
        } catch (e) {
          console.error("Failed to delete orphan APARs:", e)
        }
        const orphanSet = new Set(orphanIds)
        responseApars = transformedApars.filter((a: any) => !orphanSet.has(a._id?.toString()))
      }
    }

    return NextResponse.json({
      success: true,
      data: responseApars,
    })
  } catch (error: any) {
    console.error("Error fetching APARs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch APARs",
      },
      { status: 500 },
    )
  }
}

async function postHandler(request: AuthRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { employee, year, selfAppraisal, reviewer, status } = body

    if (!employee || !year) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields (employee, year)",
        },
        { status: 400 },
      )
    }

    // Calculate final score based on KPI scores if status is being finalized
    let finalScore = 0
    if (status === "finalized" || status === "reviewed") {
      const kpis = await Kpi.find({
        assignedTo: employee,
        status: { $in: ["completed", "Completed"] },
      })

      if (kpis.length > 0) {
        const avgKpiScore = kpis.reduce((sum, kpi) => sum + kpi.score, 0) / kpis.length
        finalScore = avgKpiScore + (body.reviewerScore || 0)
      } else {
        finalScore = body.reviewerScore || 0
      }
    }

    // Create new APAR
    const aparData: any = {
      employee,
      userId: employee,
      year,
      selfAppraisal: selfAppraisal || { achievements: "", challenges: "", innovations: "" },
      reviewer,
      reviewerScore: body.reviewerScore || 0,
      finalScore,
      status: status || "draft",
    }

    if (body.reviewerComments) {
      aparData.reviewerComments = body.reviewerComments
    }

    if (body.period) {
      aparData.period = body.period
    }

    const apar = await Apar.create(aparData)

    const populatedApar = await Apar.findById(apar._id)
      .populate("employee", "name email department position")
      .populate("userId", "name email department position")
      .populate("reviewer", "name email position")

    if (!populatedApar) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve created APAR",
        },
        { status: 500 },
      )
    }

    // Transform data to ensure consistent shapes - convert unpopulated refs to null
    const aparObj = populatedApar.toObject()

    // Ensure employee is either a populated object or null
    if (!aparObj.employee || typeof aparObj.employee === "string" || aparObj.employee._id === undefined) {
      console.warn(
        `Created APAR ${apar._id} has missing or unpopulated employee data. Employee ID: ${aparObj.employee}`,
      )
      aparObj.employee = null
    }

    // Ensure userId is either a populated object or null
    if (aparObj.userId && (typeof aparObj.userId === "string" || aparObj.userId._id === undefined)) {
      aparObj.userId = null
    }

    // Ensure reviewer is either a populated object or null
    if (aparObj.reviewer && (typeof aparObj.reviewer === "string" || aparObj.reviewer._id === undefined)) {
      console.warn(`Created APAR ${apar._id} has unpopulated reviewer data. Reviewer ID: ${aparObj.reviewer}`)
      aparObj.reviewer = null
    }

    return NextResponse.json({
      success: true,
      data: aparObj,
    })
  } catch (error: any) {
    console.error("Error creating APAR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create APAR",
      },
      { status: 500 },
    )
  }
}

export const GET = authenticate(getHandler)
export const POST = authenticate(postHandler)
