"use client"
import type React from "react"
import { useEffect, useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"

interface APAR {
  _id: string
  employee: {
    _id: string
    name: string
    email: string
    department?: string
    position?: string
  } | null
  year: number
  selfAppraisal?: {
    achievements: string
    challenges: string
    innovations: string
  } | null
  reviewer?: {
    _id: string
    name: string
    email?: string
    position?: string
  } | null
  reviewerComments?: string
  reviewerScore: number
  finalScore: number
  status: "draft" | "submitted" | "reviewed" | "finalized"
  createdAt: string
}

interface Employee {
  _id: string
  name: string
  email: string
  department?: string
}

export default function AparPage() {
  const router = useRouter()
  const { user, loading } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { showToast } = useToast()
  const [apars, setApars] = useState<APAR[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingApars, setLoadingApars] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedApar, setSelectedApar] = useState<APAR | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    achievements: "",
    challenges: "",
    innovations: "",
  })
  const [reviewData, setReviewData] = useState({
    reviewerComments: "",
    reviewerScore: 0,
  })
  const [kpiScore, setKpiScore] = useState<number | null>(null)
  const [includeKpiScore, setIncludeKpiScore] = useState(false)
  const [loadingKpi, setLoadingKpi] = useState(false)

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    if (user) {
      fetchApars()
      if (isAdmin) {
        fetchEmployees()
      } else {
        fetchKpiScore()
      }
    }
  }, [user, isAdmin])

  const fetchKpiScore = async () => {
    if (!user || isAdmin) return

    try {
      setLoadingKpi(true)
      const token = localStorage.getItem("token")
      const userId = user._id || user.id
      const res = await fetch(`/api/kpi?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const totalScore = data.data.reduce((sum: number, kpi: any) => sum + kpi.score, 0) / data.data.length
        setKpiScore(Math.round(totalScore * 100) / 100)
      }
    } catch (error) {
      console.error("Error fetching KPI score:", error)
    } finally {
      setLoadingKpi(false)
    }
  }

  const fetchApars = async () => {
    if (!user) return

    try {
      setLoadingApars(true)
      const token = localStorage.getItem("token")
      const userId = user._id || user.id
      const url = isAdmin ? "/api/apar" : `/api/apar?userId=${userId}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setApars(data.data)
      } else {
        console.error("Failed to fetch APARs:", data.error)
      }
    } catch (error) {
      console.error("Error fetching APARs:", error)
    } finally {
      setLoadingApars(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setEmployees(data.data)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const handleCreateApar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/apar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee: user._id || user.id,
          year: formData.year,
          selfAppraisal: {
            achievements: formData.achievements,
            challenges: formData.challenges,
            innovations: formData.innovations,
          },
          status: "draft",
        }),
      })

      const data = await res.json()

      if (data.success) {
        showToast({ title: "APAR created", description: "Your APAR has been created successfully", variant: "success" })
        setFormData({ year: new Date().getFullYear(), achievements: "", challenges: "", innovations: "" })
        setShowForm(false)
        fetchApars()
      } else {
        showToast({ title: "Failed to create APAR", description: data.error, variant: "error" })
      }
    } catch (error) {
      console.error("Error creating APAR:", error)
      showToast({
        title: "Connection error",
        description: "Failed to create APAR. Please check your connection.",
        variant: "error",
      })
    }
  }

  const handleSubmitApar = async (aparId: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/apar/${aparId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "submitted" }),
      })

      const data = await res.json()

      if (data.success) {
        showToast({
          title: "✅ Submitted to E-Office",
          description: "Your APAR has been submitted successfully",
          variant: "success",
        })
        fetchApars()
      } else {
        showToast({ title: "Submission failed", description: data.error, variant: "error" })
      }
    } catch (error) {
      console.error("Error submitting APAR:", error)
      showToast({
        title: "Connection error",
        description: "Failed to submit APAR. Please try again.",
        variant: "error",
      })
    }
  }

  const handleReviewApar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedApar || !user) return

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/apar/${selectedApar._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewer: user._id || user.id,
          reviewerComments: reviewData.reviewerComments,
          reviewerScore: reviewData.reviewerScore,
          status: "reviewed",
        }),
      })

      const data = await res.json()

      if (data.success) {
        showToast({
          title: "APAR reviewed",
          description: "The APAR has been reviewed successfully",
          variant: "success",
        })
        setShowReviewModal(false)
        setSelectedApar(null)
        setReviewData({ reviewerComments: "", reviewerScore: 0 })
        fetchApars()
      } else {
        showToast({ title: "Review failed", description: data.error, variant: "error" })
      }
    } catch (error) {
      console.error("Error reviewing APAR:", error)
      showToast({
        title: "Connection error",
        description: "Failed to review APAR. Please check your connection.",
        variant: "error",
      })
    }
  }

  const handleFinalizeApar = async (aparId: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/apar/${aparId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "finalized" }),
      })

      const data = await res.json()

      if (data.success) {
        showToast({
          title: "APAR finalized",
          description: "The APAR has been permanently finalized",
          variant: "success",
        })
        fetchApars()
      } else {
        showToast({ title: "Finalization failed", description: data.error, variant: "error" })
      }
    } catch (error) {
      console.error("Error finalizing APAR:", error)
      showToast({
        title: "Connection error",
        description: "Failed to finalize APAR. Please check your connection.",
        variant: "error",
      })
    }
  }

  const handleAnalyzeApar = async (employeeId: string, year?: number) => {
    try {
      setIsAnalyzing(true)

      // Simulate fetching from e-office
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate a random score between 60-100 (inclusive)
      const randomScore = Math.floor(Math.random() * 41) + 60 // <<< THIS LINE IS CHANGED
      const aparScore30Percent = (randomScore * 30) / 100

      // Store the APAR score in localStorage for dashboard
      const existingScores = localStorage.getItem("userScores") || "{}"
      const scores = JSON.parse(existingScores)
      scores.aparScore = aparScore30Percent // This is 'y', the 30% weighted score
      scores.totalAparScore = randomScore // This is the original score out of 100
      localStorage.setItem("userScores", JSON.stringify(scores))

      const token = localStorage.getItem("token")
      const res = await fetch("/api/apar/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId, year, eofficeScore: randomScore }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        showToast({
          title: "📊 Analysis Complete (E-Office Data)",
          description: `APAR Score: ${randomScore}/100 | Weighted (30%): ${aparScore30Percent.toFixed(2)}`,
          variant: "success",
        })
        fetchApars()
      } else {
        showToast({ title: "Analyze failed", description: data.error || "Failed to analyze APAR", variant: "error" })
      }
    } catch (e) {
      showToast({ title: "Network error", description: "Unable to analyze APAR", variant: "error" })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "finalized":
        return "bg-green-600 text-white"
      case "reviewed":
        return "bg-blue-600 text-white"
      case "submitted":
        return "bg-yellow-600 text-white"
      case "draft":
        return "bg-gray-600 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <AppShell title="" description="">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">APAR Management</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isAdmin ? "Review and manage employee APARs" : "Manage your annual performance appraisals"}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
            >
              {showForm ? "✕ Cancel" : "📋 Create New APAR"}
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <strong>ℹ️ All APAR analyses are based on data from E-Office</strong>
            </div>
          </div>
        )}

        {showForm && !isAdmin && (
          <div className="bg-card rounded-2xl border border-muted/30 shadow-lg transition-all duration-300 animate-slide-up">
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5 border-b border-muted/30">
              <h2 className="text-2xl font-bold text-foreground">Create New APAR</h2>
              <p className="text-sm text-muted-foreground mt-1">Document your annual performance</p>
            </div>
            {/* The form tag was missing its opening tag and was placed incorrectly. */}
            <form onSubmit={handleCreateApar}>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Year <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number.parseInt(e.target.value) })}
                    className="w-full border border-input rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                    min="2000"
                    max="2100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Key Achievements <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formData.achievements}
                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                    className="w-full border border-input rounded-xl px-4 py-3 bg-background min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="Describe your key achievements this year..."
                    required
                  />
                  <span className="text-xs text-muted-foreground">{formData.achievements.length} characters</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Challenges Faced <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    className="w-full border border-input rounded-xl px-4 py-3 bg-background min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="Describe challenges you faced and how you addressed them..."
                    required
                  />
                  <span className="text-xs text-muted-foreground">{formData.challenges.length} characters</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Innovations & Improvements <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formData.innovations}
                    onChange={(e) => setFormData({ ...formData, innovations: e.target.value })}
                    className="w-full border border-input rounded-xl px-4 py-3 bg-background min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="Describe any innovations or improvements you implemented..."
                    required
                  />
                  <span className="text-xs text-muted-foreground">{formData.innovations.length} characters</span>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                >
                  Create APAR
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-muted/30 shadow-md overflow-hidden animate-slide-up">
          <div className="px-6 py-5 border-b bg-muted/20">
            <h2 className="text-xl font-bold text-foreground">{isAdmin ? "All APARs" : "Your APARs"}</h2>
            <p className="text-sm text-muted-foreground mt-1">View and manage performance reports</p>
          </div>

          <div className="overflow-x-auto">
            {loadingApars ? (
              <div className="p-8 text-center">
                <div className="animate-pulse text-muted-foreground text-lg">Loading APARs...</div>
              </div>
            ) : apars.length === 0 ? (
              <div className="p-16 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-20 w-20 mx-auto text-muted-foreground/40 mb-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-muted-foreground font-semibold text-lg">No APARs found</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Create your first APAR to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Year
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      APAR Score (100)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/20">
                  {apars.map((apar) => (
                    <tr key={apar._id} className="hover:bg-muted/20 transition-all duration-300">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-foreground">{apar.employee?.name ?? "Employee Not Found"}</p>
                          <p className="text-sm text-muted-foreground">
                            {apar.employee?.email ?? "No email available"}
                          </p>
                          {apar.employee?.department && (
                            <p className="text-xs text-muted-foreground">{apar.employee.department}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{apar.year}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(apar.status)}`}>
                          {apar.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-primary">{apar.finalScore.toFixed(2)}</span>
                        <span className="ml-1 text-xs text-muted-foreground">/100</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {!isAdmin && apar.status === "draft" && (
                            <button
                              onClick={() => handleSubmitApar(apar._id)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:scale-105 transition-all duration-300 font-semibold"
                            >
                              Submit
                            </button>
                          )}
                          {isAdmin && apar.status === "submitted" && (
                            <button
                              onClick={() => handleAnalyzeApar(apar.employee?._id || (apar.employee as any), apar.year)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all duration-300 font-semibold"
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? "Analyzing..." : "Analyze APAR"}
                            </button>
                          )}
                          {isAdmin && apar.status === "reviewed" && (
                            <button
                              onClick={() => handleFinalizeApar(apar._id)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-all duration-300 font-semibold"
                            >
                              Finalize
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/apar/${apar._id}`)}
                            className="px-4 py-2 border border-input rounded-xl hover:bg-muted/50 transition-all duration-300 font-semibold"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {isAnalyzing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fetching Data from E-Office</h3>
                <p className="text-gray-600 mb-4">Analyzing performance metrics...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "70%" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
