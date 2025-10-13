import { NextResponse } from 'next/server';
import { requireAdmin, AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import User from '@/models/User';

export const POST = requireAdmin(async (req: AuthRequest) => {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { userId, archived } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.archived = archived !== undefined ? archived : true;
    user.archivedAt = archived ? new Date() : undefined;
    
    await user.save();

    return NextResponse.json({
      success: true,
      message: archived ? 'User archived successfully' : 'User restored successfully',
      user
    });

  } catch (error: any) {
    console.error('Error archiving user:', error);
    return NextResponse.json({ error: error.message || 'Failed to archive user' }, { status: 500 });
  }
});

export const GET = requireAdmin(async (req: AuthRequest) => {
  try {
    await dbConnect();
    
    const archivedUsers = await User.find({ archived: true }).select('-password');
    
    return NextResponse.json({
      success: true,
      users: archivedUsers
    });

  } catch (error: any) {
    console.error('Error fetching archived users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch archived users' }, { status: 500 });
  }
});
