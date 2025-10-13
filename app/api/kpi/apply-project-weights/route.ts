// app/api/kpi/apply-project-weights/route.ts - CORRECTED VERSION
import { NextResponse } from "next/server";
import { authenticate, type AuthRequest } from "@/middleware/auth";
import dbConnect from "@/utils/db";
import Kpi from "@/models/KPI";
import Project from "@/models/Project";
import User from "@/models/User";
import { normalizeWeights } from "@/utils/normalizeWeights";

export const POST = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { projectId, employeeId, period = "Annual" } = await req.json();

    if (!projectId || !employeeId) {
      return NextResponse.json({ error: "Missing required fields: projectId, employeeId" }, { status: 400 });
    }

    const [project, employee] = await Promise.all([
      Project.findById(projectId).lean(),
      User.findById(employeeId).lean(),
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!project.kpiWeights) return NextResponse.json({ error: "Project does not have AI-generated KPI weights" }, { status: 400 });

    // ✅ CRITICAL FIX: Delete ALL existing project-specific KPIs for this employee (from ANY project)
    // This ensures idempotency and prevents duplicates when switching between projects
    const deletedKPIs = await Kpi.deleteMany({ 
      assignedTo: employeeId, 
      isProjectSpecific: true 
    });
    
    console.log(`🗑️ Removed ${deletedKPIs.deletedCount} existing project-specific KPIs for employee ${employee.name}`);

    // ✅ Find the default KPIs to use as a template
    const defaultKpis = await Kpi.find({
      assignedTo: employeeId,
      period: period,
      isDefault: true,
    }).lean();

    if (defaultKpis.length === 0) {
      return NextResponse.json({ error: "No default KPIs found for this employee. Please add default KPIs first." }, { status: 400 });
    }

    const employerType = employee.employerType || "Field";
    const projectWeights = project.kpiWeights;

    // Map the weights from the project
    const weightsMap: Record<string, number> = {};
    const positiveWeights: Record<string, number> = {};

    for (const kpi of defaultKpis) {
      const weightInfo = projectWeights[kpi.kpiName];
      const targetWeight = weightInfo ? (employerType === "HQ" ? weightInfo.hqWeight : weightInfo.fieldWeight) : 0;
      
      weightsMap[kpi.kpiName] = targetWeight;
      if (targetWeight > 0) {
        positiveWeights[kpi.kpiName] = targetWeight;
      }
    }

    // Normalize weights to sum to 100%
    const normalizedWeights = normalizeWeights(positiveWeights);
    const newKpiDocuments = [];
    
    // ✅ Clone defaults and create new project-specific KPIs
    for (const defaultKpi of defaultKpis) {
      const mappedWeight = weightsMap[defaultKpi.kpiName];
      const finalWeight = mappedWeight > 0 ? (normalizedWeights[defaultKpi.kpiName] || 0) : 0;
      
      const newKpi = {
        ...defaultKpi,
        _id: undefined, // Remove _id to create new document
        isDefault: false,
        isProjectSpecific: true,
        projectId: project._id,
        projectName: project.name,
        weightage: finalWeight,
        originalWeightage: defaultKpi.weightage,
        lastUpdated: new Date(),
        progress: 0,
        score: 0,
        achievedValue: 0,
        progressNotes: `KPI created for project "${project.name}" with AI-optimized weight of ${finalWeight}%. (Original default weight was ${defaultKpi.weightage}%).`,
      };
      
      // Remove Mongoose version key
      delete (newKpi as any).__v;

      newKpiDocuments.push(newKpi);
    }

    // ✅ Bulk insert all new documents
    let createdCount = 0;
    if (newKpiDocuments.length > 0) {
      const result = await Kpi.insertMany(newKpiDocuments);
      createdCount = result.length;
    }

    // Calculate total weightage for verification
    const totalWeightage = newKpiDocuments.reduce((sum, kpi) => sum + kpi.weightage, 0);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdCount} project-specific KPIs for ${employee.name} based on "${project.name}".`,
      data: {
        projectName: project.name,
        employeeName: employee.name,
        employeeId: employee._id,
        updatedCount: createdCount,
        totalWeightage: Math.round(totalWeightage * 100) / 100,
        deletedOldKPIs: deletedKPIs.deletedCount,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error applying project KPI weights:", error);
    return NextResponse.json({ error: error.message || "Failed to apply project KPI weights" }, { status: 500 });
  }
});

export const GET = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId parameter" }, { status: 400 });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.kpiWeights) {
      return NextResponse.json({ error: "Project does not have AI-generated KPI weights" }, { status: 400 });
    }

    const preview = Object.entries(project.kpiWeights).map(([kpiName, weights]: [string, any]) => ({
      kpiName,
      fieldWeight: weights.fieldWeight,
      hqWeight: weights.hqWeight,
    }));

    return NextResponse.json({
      success: true,
      projectName: project.name,
      kpiWeights: preview,
      totalFieldWeight: preview.reduce((sum, w) => sum + w.fieldWeight, 0),
      totalHQWeight: preview.reduce((sum, w) => sum + w.hqWeight, 0),
    });
  } catch (error: any) {
    console.error("Error previewing project KPI weights:", error);
    return NextResponse.json({ error: error.message || "Failed to preview weights" }, { status: 500 });
  }
});