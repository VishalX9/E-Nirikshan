import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Kpi from '@/models/KPI';

// PATCH /api/kpi/qualitative/[id] - Update qualitative scoring (for supervisors/admins)
// Updates: qualitativeScore, supervisorComments
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    await dbConnect();

    const body = await request.json();
    const { qualitativeScore, supervisorComments } = body;

    const updateData: any = {
      lastUpdated: new Date(),
    };

    if (qualitativeScore !== undefined) {
      updateData.qualitativeScore = qualitativeScore;
    }

    if (supervisorComments !== undefined) {
      updateData.supervisorComments = supervisorComments;
    }

    const kpi = await Kpi.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email designation')
      .populate('assignedBy', 'name email');

    if (!kpi) {
      return NextResponse.json(
        {
          success: false,
          error: 'KPI not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: kpi,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update qualitative score',
      },
      { status: 500 }
    );
  }
}
