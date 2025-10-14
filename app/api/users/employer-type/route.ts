import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

type EmployerType = 'Field' | 'HQ';

interface UpdateItem {
  email: string;
  employerType: EmployerType | 'field employee' | 'headquarter employee' | 'Headquarter Employee' | 'Field Employee' | 'field' | 'hq';
}

function normalizeEmployerType(value: UpdateItem['employerType']): EmployerType {
  const v = String(value).toLowerCase();
  return v.includes('hq') || v.includes('headquarter') || v.includes('head') ? 'HQ' : 'Field';
}

async function postHandler(req: AuthRequest) {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();

    // Default mapping if no body provided
    let payload: UpdateItem[] | undefined;
    try {
      const body = await req.json();
      payload = Array.isArray(body?.updates) ? body.updates : undefined;
    } catch {
      // ignore - will use default mapping
    }

    const updates: UpdateItem[] = payload ?? [
      { email: 'aryan.kumar_ug23@nsut.ac.in', employerType: 'field employee' },
      { email: 'adit.bal.007@gmail.com', employerType: 'headquarter employee' },
      { email: 'aryankumar500131@gmail.com', employerType: 'headquarter employee' },
      { email: 'vishal123@gmail.com', employerType: 'field employee' },
    ];

    const results: Array<{ email: string; updated: boolean; message?: string }> = [];

    for (const item of updates) {
      const targetType = normalizeEmployerType(item.employerType);
      const user = await User.findOne({ email: item.email });
      if (!user) {
        results.push({ email: item.email, updated: false, message: 'User not found' });
        continue;
      }
      if (user.employerType === targetType) {
        results.push({ email: item.email, updated: false, message: 'No change' });
        continue;
      }
      user.employerType = targetType;
      await user.save();
      results.push({ email: item.email, updated: true });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = authenticate(postHandler);
