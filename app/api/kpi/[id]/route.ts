import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';
import { authenticate, AuthRequest } from '@/middleware/auth';

// GET single KPI by ID
async function getHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    await dbConnect();
    const { id } = params;

    const kpi = await Kpi.findById(id)
      .populate('assignedTo', 'name email designation department role')
      .populate('assignedBy', 'name email');

    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }

    // Check permissions - Admin or assigned user can view
    if (req.user?.role !== 'admin') {
      if (kpi.assignedTo.toString() !== req.user?.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: kpi });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update KPI (progress, status, notes)
async function patchHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const kpi = await Kpi.findById(id);

    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }

    // Only admins can modify KPIs
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only admins can modify KPI data' },
        { status: 403 }
      );
    }

    // Protect default KPIs from modification
    if (kpi.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Default KPIs cannot be modified' },
        { status: 403 }
      );
    }

    // Admin can update metadata only (no scores/progress/achieved)
    const forbiddenFields = ['achievedValue', 'score', 'progress', 'qualitativeScore', 'eofficeScore'];
    for (const key of forbiddenFields) {
      if (key in body) delete body[key];
    }
    if (body.status) kpi.status = body.status;
    if (body.progressNotes !== undefined) kpi.progressNotes = body.progressNotes;
    if (body.supervisorComments !== undefined) kpi.supervisorComments = body.supervisorComments;
    if (body.remarks !== undefined) kpi.remarks = body.remarks;

    kpi.lastUpdated = new Date();

    await kpi.save(); // This triggers the pre-save hook to calculate score and progress

    const updatedKpi = await Kpi.findById(id)
      .populate('assignedTo', 'name email designation department role')
      .populate('assignedBy', 'name email');

    return NextResponse.json({ success: true, data: updatedKpi });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE KPI
async function deleteHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    // Only admins can delete KPIs
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete KPIs' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = params;

    const kpi = await Kpi.findById(id);
    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }
    // Protect default KPIs
    if (kpi.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Default KPIs cannot be deleted' },
        { status: 403 }
      );
    }
    // Admin can delete only KPIs they personally added
    if (kpi.assignedBy?.toString() !== req.user?.userId) {
      return NextResponse.json(
        { success: false, error: 'You can delete only KPIs you added' },
        { status: 403 }
      );
    }

    await Kpi.findByIdAndDelete(id);

    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'KPI deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Full update (admin only)
async function putHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can fully update KPIs' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const kpi = await Kpi.findByIdAndUpdate(
      id,
      { ...body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email designation department role')
      .populate('assignedBy', 'name email');

    if (!kpi) {
      return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: kpi });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const PATCH = authenticate(patchHandler);
export const DELETE = authenticate(deleteHandler);
export const PUT = authenticate(putHandler);
