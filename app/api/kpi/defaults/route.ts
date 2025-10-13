// app/api/kpi/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

// ======================
// Default KPI Templates
// ======================

// Field Employee Default KPIs (8 parameters, 12.5 each = 100 total)
const FIELD_EMPLOYEE_KPIS = [
  { kpiName: 'Timeliness of DPR Preparation', weightage: 12.5, metric: 'Score', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Quality of DPR Preparation', weightage: 12.5, metric: 'Score', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Survey Accuracy', weightage: 12.5, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Adherence to Project Timelines', weightage: 12.5, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Expenditure Targets', weightage: 12.5, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Financial Targets', weightage: 12.5, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Physical Progress of Works', weightage: 12.5, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Compliance with Technical Standards', weightage: 12.5, metric: 'Score', target: 100, achievedValue: 0, period: 'Annual' },
];

// HQ Employee Default KPIs (5 parameters, 20 each = 100 total)
const HQ_EMPLOYEE_KPIS = [
  { kpiName: 'File Disposal Rate', weightage: 20, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Turnaround Time', weightage: 20, metric: 'Days', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Quality of Drafting', weightage: 20, metric: 'Score', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Responsiveness', weightage: 20, metric: 'Score', target: 100, achievedValue: 0, period: 'Annual' },
  { kpiName: 'Digital Adoption', weightage: 20, metric: 'Percentage', target: 100, achievedValue: 0, period: 'Annual' },
];

// ======================
// POST → Create Default KPIs
// ======================
async function postHandler(req: AuthRequest) {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();
    const { userId, employerType } = await req.json();

    if (!userId || !employerType) {
      return NextResponse.json({ success: false, error: 'userId and employerType required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if user already has default KPIs
    const existingDefaults = await Kpi.find({ assignedTo: userId, isDefault: true });
    if (existingDefaults.length > 0) {
      return NextResponse.json({ success: false, error: 'Default KPIs already exist for this user' }, { status: 400 });
    }

    // Pick KPI template
    const kpiTemplate = employerType === 'HQ' ? HQ_EMPLOYEE_KPIS : FIELD_EMPLOYEE_KPIS;

    // Create default KPIs
    const defaultKpis = await Promise.all(
      kpiTemplate.map(kpiData =>
        Kpi.create({
          ...kpiData,
          assignedTo: userId,
          assignedBy: req.user?.userId,
          isDefault: true,
          isProjectSpecific: false,
          source: 'e-office',
          readOnly: true,
          employerType,
          status: 'not_started',
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Created ${defaultKpis.length} default KPIs for ${employerType} employee`,
      data: defaultKpis,
    });
  } catch (error: any) {
    console.error('Error creating default KPIs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ======================
// GET → Fetch KPIs (with optional filter for new ones)
// ======================
async function getHandler(req: AuthRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isProjectSpecific = searchParams.get('isProjectSpecific');
    const employerType = searchParams.get('employerType');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId parameter' }, { status: 400 });
    }

    const filter: any = { assignedTo: userId };

    // 🔥 key part — only fetch new KPIs when requested
    if (isProjectSpecific === 'true') {
      filter.isProjectSpecific = true;
    }

    if (employerType) {
      filter.employerType = employerType;
    }

    const kpis = await Kpi.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: kpis }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ======================
export const POST = authenticate(postHandler);
export const GET = authenticate(getHandler);
