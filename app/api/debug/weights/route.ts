import { NextResponse } from 'next/server';
import { authenticate, type AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import Project from '@/models/Project';
import Kpi from '@/models/KPI';

export const GET = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const employeeId = searchParams.get('employeeId');

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (!project.kpiWeights) {
        return NextResponse.json(
          { error: 'Project does not have KPI weights' },
          { status: 400 }
        );
      }

      const fieldWeights: { [key: string]: number } = {};
      const hqWeights: { [key: string]: number } = {};
      let fieldTotal = 0;
      let hqTotal = 0;

      for (const [kpiName, weights] of Object.entries(project.kpiWeights)) {
        const w = weights as any;
        fieldWeights[kpiName] = w.fieldWeight || 0;
        hqWeights[kpiName] = w.hqWeight || 0;
        fieldTotal += w.fieldWeight || 0;
        hqTotal += w.hqWeight || 0;
      }

      return NextResponse.json({
        success: true,
        project: project.name,
        projectId: project._id,
        fieldWeights,
        hqWeights,
        totals: {
          field: parseFloat(fieldTotal.toFixed(2)),
          hq: parseFloat(hqTotal.toFixed(2)),
        },
        validation: {
          fieldValid: Math.abs(fieldTotal - 100) <= 0.5,
          hqValid: Math.abs(hqTotal - 100) <= 0.5,
        },
      });
    }

    if (employeeId) {
      const kpis = await Kpi.find({ assignedTo: employeeId });
      if (kpis.length === 0) {
        return NextResponse.json(
          { error: 'No KPIs found for this employee' },
          { status: 404 }
        );
      }

      const weights: { [key: string]: number } = {};
      let total = 0;

      for (const kpi of kpis) {
        weights[kpi.kpiName] = kpi.weightage;
        total += kpi.weightage;
      }

      const projectSpecificKpis = kpis.filter(k => k.isProjectSpecific);

      return NextResponse.json({
        success: true,
        employeeId,
        totalKpis: kpis.length,
        projectSpecificCount: projectSpecificKpis.length,
        weights,
        total: parseFloat(total.toFixed(2)),
        validation: {
          valid: Math.abs(total - 100) <= 0.5,
          message: Math.abs(total - 100) <= 0.5 ? 'Weights sum to 100%' : `Weights sum to ${total}%`,
        },
      });
    }

    const projects = await Project.find({ kpiWeights: { $exists: true } }).select('name kpiWeights');
    const results = [];

    for (const project of projects) {
      let fieldTotal = 0;
      let hqTotal = 0;

      for (const weights of Object.values(project.kpiWeights || {})) {
        const w = weights as any;
        fieldTotal += w.fieldWeight || 0;
        hqTotal += w.hqWeight || 0;
      }

      results.push({
        projectId: project._id,
        projectName: project.name,
        kpiCount: Object.keys(project.kpiWeights || {}).length,
        totals: {
          field: parseFloat(fieldTotal.toFixed(2)),
          hq: parseFloat(hqTotal.toFixed(2)),
        },
        valid: {
          field: Math.abs(fieldTotal - 100) <= 0.5,
          hq: Math.abs(hqTotal - 100) <= 0.5,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Weight validation summary for all projects',
      projectCount: results.length,
      projects: results,
    });

  } catch (error: any) {
    console.error('Error debugging weights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to debug weights' },
      { status: 500 }
    );
  }
});
