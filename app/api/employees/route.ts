import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import dbConnect from "@/utils/db"
import User from "@/models/User"
import { type AuthRequest, requireAdmin } from "@/middleware/auth"

async function getEmployees(_: AuthRequest) {
  try {
    await dbConnect()
    const employees = await User.find().select("-password").sort({ createdAt: -1 })

    const safeEmployees = employees.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      employerType: u.employerType,
      department: u.department,
      position: u.position,
      createdAt: u.createdAt,
    }))

    return NextResponse.json({ employees: safeEmployees })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to fetch employees" }, { status: 500 })
  }
}

async function createEmployee(req: AuthRequest) {
  try {
    await dbConnect()
    const { name, email, password, role, department, position, employerType } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    }

    const normalizedEmployerType = employerType && String(employerType).toLowerCase().includes("hq") ? "HQ" : "Field"

    const hashedPassword = await bcrypt.hash(password, 10)
    const employee = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "employee",
      department,
      position,
      employerType: normalizedEmployerType,
    })

    const safeEmployee = {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      employerType: employee.employerType,
      department: employee.department,
      position: employee.position,
      createdAt: employee.createdAt,
    }

    return NextResponse.json({ employee: safeEmployee }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to create employee" }, { status: 500 })
  }
}

export const GET = requireAdmin(getEmployees)
export const POST = requireAdmin(createEmployee)
