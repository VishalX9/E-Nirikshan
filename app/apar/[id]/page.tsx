"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/useToast"

interface KpiScore {
  kpi: {
    kpiName: string
    metric: string
    target: number
    achievedValue: number
    score: number
    weightage: number
  }
  score: number
}

interface Apar {
  _id: string
  employee?: {
    name: string
    email: string
    designation?: string
    department?: string
    position?: string
  }
  reviewer?: {
    name: string
    email: string
    designation?: string
    position?: string
  }
  year: number
  period?: string
  selfAppraisal?: {
    achievements: string
    challenges: string
    innovations: string
  }
  reviewerComments?: string
  reviewerScore?: number
  finalScore?: number
  periodFrom?: string
  periodTo?: string
  kpiScores?: KpiScore[]
  quantitativeScore?: number
  qualitativeFeedback?: string
  finalRating?: number
  status: string
}

export default function AparDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const [apar, setApar] = useState<Apar | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [scores, setScores] = useState<{ outputScore: number; behaviouralScore: number; totalScore: number } | null>(
    null,
  )

  useEffect(() => {
    if (params.id) {
      fetchApar(params.id as string)
    }
  }, [params.id])

  const fetchApar = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/apar/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setApar(data.data)
        setFeedback(data.data.qualitativeFeedback || "")

        // Fetch KPI/APAR composite scores for the employee (admin can view)
        const employeeId = data.data?.employee?._id || data.data?.userId
        if (employeeId) {
          const scoresRes = await fetch(`/api/scores?userId=${employeeId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (scoresRes.ok) {
            const s = await scoresRes.json()
            setScores({
              outputScore: Number(s.outputScore ?? 0),
              behaviouralScore: Number(s.behaviouralScore ?? 0),
              totalScore: Number(s.totalScore ?? 0),
            })
          }
        }
      } else {
        console.error("Failed to fetch APAR:", data.error)
      }
    } catch (error) {
      console.error("Error fetching APAR:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!params.id) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/apar/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qualitativeFeedback: feedback,
          // set to the proper enum value recognized by the API/model
          status: "submitted",
        }),
      })

      const data = await response.json()
      if (data.success) {
        showToast({
          title: "APAR submitted",
          description: "Your APAR has been submitted successfully",
          variant: "success",
        })
        router.push("/apar")
      } else {
        showToast({ title: "Submission failed", description: data.error || "Failed to submit APAR", variant: "error" })
      }
    } catch (error) {
      console.error("Error updating APAR:", error)
      showToast({ title: "Error", description: "Error updating APAR", variant: "error" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading APAR details...</p>
      </div>
    )
  }

  if (!apar) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">APAR not found</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/apar" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
            ← Back to APARs
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">APAR Details</h1>

          {scores && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-600">KPI Score (70%)</p>
                <p className="text-2xl font-bold text-blue-600">{scores.outputScore.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-600">APAR Behaviour (30%)</p>
                <p className="text-2xl font-bold text-emerald-600">{scores.behaviouralScore.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-slate-900">{scores.totalScore.toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Employee</h3>
              <p className="text-lg font-semibold text-gray-900">{apar.employee?.name || "Employee Not Found"}</p>
              <p className="text-sm text-gray-600">{apar.employee?.email || "No email available"}</p>
              {apar.employee?.position && <p className="text-sm text-gray-600">{apar.employee.position}</p>}
              {apar.employee?.department && <p className="text-sm text-gray-600">{apar.employee.department}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Reviewer</h3>
              <p className="text-lg font-semibold text-gray-900">{apar.reviewer?.name || "Not Assigned"}</p>
              <p className="text-sm text-gray-600">{apar.reviewer?.email || "N/A"}</p>
              {apar.reviewer?.position && <p className="text-sm text-gray-600">{apar.reviewer.position}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Review Period</h3>
              <p className="text-gray-900">
                {apar.periodFrom && apar.periodTo
                  ? `${formatDate(apar.periodFrom)} - ${formatDate(apar.periodTo)}`
                  : `Year ${apar.year}${apar.period ? ` - ${apar.period}` : ""}`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {apar.status}
              </span>
            </div>
          </div>

          {apar.selfAppraisal && (
            <div className="border-t pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Self Appraisal</h2>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Key Achievements</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {apar.selfAppraisal.achievements || "Not provided"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Challenges Faced</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{apar.selfAppraisal.challenges || "Not provided"}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Innovations & Improvements</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {apar.selfAppraisal.innovations || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(apar.reviewerComments || apar.reviewerScore !== undefined) && (
            <div className="border-t pt-8 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reviewer Feedback</h2>

              {apar.reviewerComments && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Comments</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{apar.reviewerComments}</p>
                </div>
              )}

              {apar.reviewerScore !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">Reviewer Score</h4>
                      <p className="text-sm text-gray-600">Out of 30</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{apar.reviewerScore.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {apar.finalScore !== undefined && (
            <div className="border-t pt-8 mt-8">
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Final Score</h3>
                    <p className="text-sm text-gray-600">Combined evaluation score</p>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{apar.finalScore.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {apar.kpiScores && apar.kpiScores.length > 0 && (
            <div className="border-t pt-8 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics (KPIs)</h2>

              <div className="space-y-4">
                {apar.kpiScores.map((kpiScore, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{kpiScore.kpi.kpiName}</h4>
                        <p className="text-sm text-gray-600">{kpiScore.kpi.metric}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Weightage</p>
                        <p className="font-semibold text-gray-900">{kpiScore.kpi.weightage}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="font-medium text-gray-900">{kpiScore.kpi.target}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Achieved</p>
                        <p className="font-medium text-gray-900">{kpiScore.kpi.achievedValue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="font-semibold text-blue-600">{kpiScore.score.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {apar.quantitativeScore !== undefined && (
                <div className="mt-6 bg-blue-50 rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Total Quantitative Score</h3>
                      <p className="text-sm text-gray-600">Based on KPI achievements</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">{apar.quantitativeScore.toFixed(2)}</p>
                      {apar.finalRating !== undefined && (
                        <p className="text-sm text-gray-600">Final Rating: {apar.finalRating}/10</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t mt-8 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Qualitative Feedback</h2>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-4 min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter qualitative feedback and observations..."
            />
          </div>

          {apar.status === "draft" && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Submit APAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
