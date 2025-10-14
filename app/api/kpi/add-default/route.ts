import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';
import User from '@/models/User';
import { getDefaultKPIs } from '@/config/kpi-defaults';

export const POST = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();
    
    const body = await req.json();
    const { employeeId, employerType, period } = body;

    if (!employeeId || !employerType || !period) {
      return NextResponse.json({ 
        error: 'Missing required fields: employeeId, employerType, period' 
      }, { status: 400 });
    }

    if (employerType !== 'Field' && employerType !== 'HQ') {
      return NextResponse.json({ 
        error: 'Invalid employer type. Must be "Field" or "HQ"' 
      }, { status: 400 });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const defaultKPIs = getDefaultKPIs(employerType);
    
    const kpiPromises = defaultKPIs.map(kpi => {
      return Kpi.create({
        kpiName: kpi.kpiName,
        metric: kpi.metric,
        weightage: kpi.weightage,
        description: kpi.description,
        target: 100,
        achievedValue: 0,
        period,
        employerType,
        assignedTo: employeeId,
        assignedBy: req.user?.userId,
        source: 'e-office',
        isDefault: true,
        status: 'not_started'
      });
    });

    const createdKPIs = await Promise.all(kpiPromises);

    return NextResponse.json({ 
      success: true, 
      message: `${createdKPIs.length} KPIs added successfully`,
      kpis: createdKPIs 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding default KPIs:', error);
    return NextResponse.json({ error: error.message || 'Failed to add KPIs' }, { status: 500 });
  }
});
