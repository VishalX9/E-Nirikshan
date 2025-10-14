import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import DPR from '@/models/DPR';
import { updateKPIFromDPR } from '@/utils/ai/recalculateKPI';

export const POST = authenticate(async (req: AuthRequest) => {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { projectId, progress, challenges, nextSteps } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const dpr = await DPR.create({
      userId: req.user?.userId,
      projectId,
      date: new Date(),
      progress: progress || '',
      challenges: challenges || '',
      nextSteps: nextSteps || '',
      status: 'submitted'
    });

    await updateKPIFromDPR(
      req.user?.userId as string, 
      projectId, 
      { progress, challenges, nextSteps }
    );

    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      message: '📤 DPR submitted to e-Office — KPI metrics updated',
      dpr
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error submitting DPR:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit DPR' }, { status: 500 });
  }
});
