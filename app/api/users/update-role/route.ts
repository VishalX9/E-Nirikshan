import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

// PATCH - Update user role (admin only)
async function patchHandler(req: AuthRequest) {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update user roles' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { userId, role } = await req.json();
    
    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'userId and role required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'employee'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(
      userId, 
      { role }, 
      { new: true }
    ).select('-password');
    
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `User role updated to ${role} successfully`,
      data: updated 
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = authenticate(patchHandler);
