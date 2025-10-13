import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Notification from '@/models/Notification';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const read = searchParams.get('read');
    const type = searchParams.get('type');

    const query: any = {};
    
    if (userId) {
      query.user = userId;
    }
    
    if (read !== null && read !== undefined) {
      query.read = read === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { user, message, type, relatedId } = body;

    if (!user || !message || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields (user, message, type)',
        },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      user,
      message,
      type,
      relatedId,
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create notification',
      },
      { status: 500 }
    );
  }
}
