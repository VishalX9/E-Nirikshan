import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';
import { authenticate, AuthRequest } from '@/middleware/auth';

// POST - Approve or reject pending update
async function postHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    // Only admins can review
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can review updates' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = params;
    const { action } = await req.json();

    const kpi = await Kpi.findById(id);

    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }

    if (!kpi.pendingUpdate) {
      return NextResponse.json(
        { success: false, error: 'No pending update to review' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Apply the pending update
      kpi.achievedValue = kpi.pendingUpdate.achievedValue;
      kpi.status = kpi.pendingUpdate.status as "not_started" | "in_progress" | "completed" | "at_risk" | "Pending" | "In Progress" | "Completed";
      if (kpi.pendingUpdate.progressNotes) {
        kpi.progressNotes = kpi.pendingUpdate.progressNotes;
      }
      kpi.lastUpdated = new Date();
      
      // Clear pending update
      kpi.pendingUpdate = undefined;
      
      await kpi.save(); // Triggers score calculation
    } else if (action === 'reject') {
      // Just clear the pending update
      kpi.pendingUpdate = undefined;
      await kpi.save();
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const updatedKpi = await Kpi.findById(id)
      .populate('assignedTo', 'name email designation department role')
      .populate('assignedBy', 'name email');

    return NextResponse.json({ 
      success: true, 
      data: updatedKpi,
      message: action === 'approve' ? 'Update approved successfully' : 'Update rejected'
    });
  } catch (error: any) {
    console.error('Error processing review:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const POST = authenticate(postHandler);
