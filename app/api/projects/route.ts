import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Project from '@/models/Project';
import { authenticate, AuthRequest } from '@/middleware/auth';
import { analyzeKPIWithGemini } from '@/utils/ai/analyzeKPI';

async function getHandler(req: AuthRequest) {
  try {
    await dbConnect();
    
    const projects = await Project.find()
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ projects });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function postHandler(req: AuthRequest) {
  try {
    await dbConnect();
    
    const { 
      name, 
      description, 
      status, 
      assignedTo, 
      tasks,
      department,
      tags,
      complexity,
      duration,
      budget,
      fieldInvolvement,
      hqInvolvement,
      expectedDeliverables
    } = await req.json();
    
    const projectData = {
      name,
      description,
      department,
      tags,
      complexity,
      duration,
      budget,
      fieldInvolvement,
      hqInvolvement,
      expectedDeliverables
    };
    
    const kpiWeights = await analyzeKPIWithGemini(projectData);
    
    const project = await Project.create({
      name,
      description,
      status: status || 'active',
      assignedTo: assignedTo || [],
      tasks: tasks || [],
      createdBy: req.user?.userId,
      department,
      tags,
      complexity,
      duration,
      budget,
      fieldInvolvement,
      hqInvolvement,
      expectedDeliverables,
      kpiWeights
    });
    
    return NextResponse.json({ project, kpiWeights }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const POST = authenticate(postHandler);
