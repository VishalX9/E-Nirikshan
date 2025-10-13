import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Project from '@/models/Project';
import { authenticate, AuthRequest } from '@/middleware/auth';

async function getHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const project = await Project.findById(id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Auto-migrate 'done' to 'completed' when fetching
    if (project.tasks.some(task => task.status === 'done')) {
      project.tasks = project.tasks.map(task => ({
        ...task,
        status: task.status === 'done' ? 'completed' : task.status
      }));
      await project.save();
    }

    return NextResponse.json({ project });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function putHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const updates = await req.json();

    // Auto-migrate any 'done' status to 'completed' in the updates
    if (updates.tasks && Array.isArray(updates.tasks)) {
      updates.tasks = updates.tasks.map((task: any) => ({
        ...task,
        status: task.status === 'done' ? 'completed' : task.status
      }));
    }

    const project = await Project.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const PUT = authenticate(putHandler);
export const DELETE = authenticate(deleteHandler);
