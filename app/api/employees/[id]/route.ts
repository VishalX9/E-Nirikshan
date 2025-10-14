import { NextResponse } from "next/server"
import mongoose from "mongoose"
import dbConnect from "@/utils/db"
import User from "@/models/User"
import { type AuthRequest, requireAdmin } from "@/middleware/auth"
import Apar from "@/models/APAR"

function normalizeEmployerType(value: any | undefined) {
  if (value === undefined || value === null) return undefined
  const v = String(value).toLowerCase()
  return v.includes("hq") || v.includes("headquarter") ? "HQ" : "Field"
}

/**
 * Update (Full) employee - PUT
 */
async function updateEmployee(req: AuthRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const { id } = params
    const body = await req.json()
    const { role, department, position } = body
    const employerType = normalizeEmployerType(body.employerType)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }

    const update: any = { role, department, position }
    if (employerType) update.employerType = employerType

    const updatedEmployee = await User.findByIdAndUpdate(id, update, { new: true }).select("-password")

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ employee: updatedEmployee })
  } catch (error: any) {
    console.error("Update Employee Error:", error)
    return NextResponse.json({ error: "Unable to update employee" }, { status: 500 })
  }
}

/**
 * Edit (Partial update) employee - PATCH
 */
async function editEmployee(req: AuthRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const { id } = params
    const updateData = await req.json()

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }

    if ("employerType" in updateData) {
      updateData.employerType = normalizeEmployerType(updateData.employerType)
    }

    const updatedEmployee = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password")

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ employee: updatedEmployee })
  } catch (error: any) {
    console.error("Edit Employee Error:", error)
    return NextResponse.json({ error: "Unable to edit employee" }, { status: 500 })
  }
}

/**
 * Delete employee - DELETE
 */
async function deleteEmployee(req: AuthRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const { id } = params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }

    const deletedEmployee = await User.findByIdAndDelete(id)

    if (!deletedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Cascade delete orphan APARs when deleting an employee
    await Apar.deleteMany({
      $or: [{ employee: id }, { userId: id }],
    })

    return NextResponse.json({ message: "Employee deleted successfully" })
  } catch (error: any) {
    console.error("Delete Employee Error:", error)
    return NextResponse.json({ error: "Unable to delete employee" }, { status: 500 })
  }
}

// Wrap all handlers in admin middleware
export const PUT = requireAdmin(updateEmployee)
export const PATCH = requireAdmin(editEmployee)
export const DELETE = requireAdmin(deleteEmployee)
