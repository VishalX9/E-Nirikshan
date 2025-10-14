import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import DPR from '@/models/DPR';
import { authenticate, AuthRequest } from '@/middleware/auth';

async function getHandler(req: AuthRequest) {
  try {
    await dbConnect();
    
    const filter = { userId: req.user?.userId };
    
    const dprs = await DPR.find(filter)
      .populate('userId', 'name email')
      .populate('projectId', 'name')
      .sort({ date: -1 });
    
    return NextResponse.json({ dprs });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function postHandler(req: AuthRequest) {
  try {
    await dbConnect();
    
    const { date, content, summary, projectId } = await req.json();
    
    const dpr = await DPR.create({
      userId: req.user?.userId,
      date,
      content,
      summary,
      projectId
    });
    
    return NextResponse.json({ dpr }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const POST = authenticate(postHandler);
