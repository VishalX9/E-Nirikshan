import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Notification from '@/models/Notification';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    await dbConnect();

    const body = await request.json();
    const { read } = body;

    const notification = await Notification.findByIdAndUpdate(
      params.id,
      { read },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update notification',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    await dbConnect();

    const notification = await Notification.findByIdAndDelete(params.id);

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete notification',
      },
      { status: 500 }
    );
  }
}
