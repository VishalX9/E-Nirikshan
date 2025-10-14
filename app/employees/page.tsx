"use client"

import { type FormEvent, useEffect, useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"

// --- Constants for Dropdowns ---
const DEPARTMENTS = [
  "Public Works",
  "PWD",
  "Transport",
  "Education",
  "Health",
  "Finance",
  "Administration",
  "IT & Technology",
  "Human Resources",
  "Other",
]

const POSITIONS = [
  "Officer",
  "Clerk",
  "Engineer",
  "Head",
  "Manager",
  "Assistant",
  "Supervisor",
  "Director",
  "Specialist",
  "Other",
]

// --- Type Definitions ---
interface Employee {
  id: string
  name: string
  email: string
  role: "admin" | "employee"
  department?: string
  position?: string
  employerType?: "Field" | "HQ"
  createdAt?: string
}

const initialFormState = {
  name: "",
  email: "",
  password: "",
  role: "employee" as Employee["role"],
  department: "",
  position: "",
  employerType: "Field" as "Field" | "HQ",
}

// --- Component ---
export default function EmployeesPage() {
  const { user, token, loading } = useAuth({ requireAuth: true, redirectTo: "/home" })
  const { showToast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // --- State for Edit/Delete Functionality ---
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    if (!token || !isAdmin) return

    const fetchEmployees = async () => {
      setIsLoadingEmployees(true)
      try {
        const response = await fetch("/api/employees", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to load employees")
        setEmployees(data.employees || [])
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch employees"
        showToast({ title: "Employee error", description: message, variant: "error" })
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [token, showToast, isAdmin])

  // --- Handler for Creating an Employee ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !isAdmin) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create employee")

      showToast({
        title: "Employee added",
        variant: "success",
        description: `${data.employee.name} has been onboarded.`,
      })
      setForm(initialFormState)
      setEmployees((prev) => [data.employee, ...prev])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add employee"
      showToast({ title: "Creation failed", description: message, variant: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Handler for Updating an Employee ---
  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !editingEmployee) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingEmployee),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to update employee")

      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editingEmployee.id ? data.employee : emp))
      )
      showToast({
        title: "Update successful",
        variant: "success",
        description: `${data.employee.name}'s details were updated.`,
      })
      setEditingEmployee(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred."
      showToast({ title: "Update failed", description: message, variant: "error" })
    } finally {
      setIsUpdating(false)
    }
  }

  // --- Handler for Deleting an Employee ---
  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      return
    }
    if (!token) return

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete employee")
      }

      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId))
      showToast({ title: "Employee deleted", variant: "success", description: `${employeeName} has been removed.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete employee"
      showToast({ title: "Deletion failed", description: message, variant: "error" })
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-slate-500">
        Loading employees...
      </div>
    )
  }

  const employeeView = (
    <div className="mt-6 space-y-6">
      {/* --- Add Employee Form Section --- */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add employee</h2>
            <p className="text-sm text-slate-500">Create new accounts for staff members joining your department.</p>
          </div>
          <p className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-600">Admins only</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="email"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            type="password"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
          <select
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as Employee["role"] }))}
          >
            <option value="employee">Employee</option>
            <option value="admin">Administrator</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.employerType}
            onChange={(e) => setForm((prev) => ({ ...prev, employerType: e.target.value as "Field" | "HQ" }))}
          >
            <option value="Field">Field Employee</option>
            <option value="HQ">Headquarter Employee</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.department}
            onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            required
          >
            <option value="" disabled>
              Select Department
            </option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={form.position}
            onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
            required
          >
            <option value="" disabled>
              Select Position
            </option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </section>

      {/* --- Team Directory Section --- */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Team directory</h2>
            <p className="text-sm text-slate-500">Overview of all users across the system.</p>
          </div>
          {isLoadingEmployees && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-500">Loading...</span>
          )}
        </div>
        <div className="mt-5 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{employee.name}</td>
                  <td className="px-4 py-3 text-slate-500">{employee.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        employee.role === "admin"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {employee.employerType
                      ? employee.employerType === "HQ"
                        ? "Headquarter"
                        : "Field"
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{employee.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{employee.position || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {employee.role === "employee" && (
                      <>
                        <button
                          onClick={() => setEditingEmployee(employee)}
                          className="mr-4 rounded px-2 py-1 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-200 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id, employee.name)}
                          className="rounded px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoadingEmployees && employees.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                    No employees yet. Add your first team member above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  return (
    <AppShell
      title="Employee Management"
      description="Onboard new team members, review roles, and maintain the organization directory."
    >
      {isAdmin ? (
        employeeView
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          You currently have a standard employee role. Please contact an administrator for access to the employee
          directory.
        </div>
      )}

      {/* --- Edit Employee Modal --- */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Edit: {editingEmployee.name}</h2>
            <p className="text-sm text-slate-500">Update the details for this employee.</p>
            <form onSubmit={handleUpdate} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Role</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingEmployee.role}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, role: e.target.value as Employee["role"] })
                  }
                  disabled
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Employee Type</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingEmployee.employerType || "Field"}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, employerType: e.target.value as "Field" | "HQ" })
                  }
                >
                  <option value="Field">Field Employee</option>
                  <option value="HQ">Headquarter Employee</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600">Department</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingEmployee.department}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600">Position</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingEmployee.position}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                >
                  <option value="">Select Position</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
