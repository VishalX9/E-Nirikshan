import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

async function getHandler(req: AuthRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const employerType = searchParams.get('employerType');
    
    const query: any = {};
    
    if (req.user?.role === 'admin') {
      if (userId) query.assignedTo = userId;
    } else {
      query.assignedTo = req.user?.userId;
    }
    
    if (employerType) {
      (query as any).employerType = employerType === 'HQ' ? 'HQ' : 'Field';
    }

    const kpis = await Kpi.find(query)
      .populate('assignedTo', 'name email designation department role')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: kpis });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function postHandler(req: AuthRequest) {
  try {
    // Only admins can create KPI templates
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can create KPI templates' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    const body = await req.json();
    
    const kpiData = {
      ...body,
      assignedBy: req.user?.userId,
    };
    
    // Force read-only scores and disallow setting achieved/score via API for default KPIs
    delete (kpiData as any).achievedValue;
    delete (kpiData as any).score;
    delete (kpiData as any).eofficeScore;
    
    // Set appropriate flags for admin-created KPIs
    const kpi = await Kpi.create({ 
      ...kpiData, 
      readOnly: true, // Admin-created KPIs are read-only for employees
      isDefault: false, // Not default KPIs, these are admin templates
      source: 'manual', // Created manually by admin
      verificationStatus: 'pending' // Pending verification
    });
    
    const populatedKpi = await Kpi.findById(kpi._id)
      .populate('assignedTo', 'name email designation department role employerType')
      .populate('assignedBy', 'name email');
    
    return NextResponse.json({ success: true, data: populatedKpi }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const POST = authenticate(postHandler);
