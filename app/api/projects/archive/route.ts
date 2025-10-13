import { NextResponse } from 'next/server';
import { requireAdmin, AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import Project from '@/models/Project';

export const POST = requireAdmin(async (req: AuthRequest) => {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { projectId, archived } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    project.archived = archived !== undefined ? archived : true;
    project.archivedAt = archived ? new Date() : undefined;
    
    await project.save();

    return NextResponse.json({
      success: true,
      message: archived ? 'Project archived successfully' : 'Project restored successfully',
      project
    });

  } catch (error: any) {
    console.error('Error archiving project:', error);
    return NextResponse.json({ error: error.message || 'Failed to archive project' }, { status: 500 });
  }
});

export const GET = requireAdmin(async (req: AuthRequest) => {
  try {
    await dbConnect();
    
    const archivedProjects = await Project.find({ archived: true })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    return NextResponse.json({
      success: true,
      projects: archivedProjects
    });

  } catch (error: any) {
    console.error('Error fetching archived projects:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch archived projects' }, { status: 500 });
  }
});
