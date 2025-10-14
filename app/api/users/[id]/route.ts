import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

// GET single user by ID
async function getHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    await dbConnect();
    const { id } = params;

    // Check permissions - users can view their own profile, admins can view anyone
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.userId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update user (admin or self)
async function patchHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.userId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Prevent non-admins from changing role
    if (!isAdmin && body.role) {
      return NextResponse.json(
        { success: false, error: 'Only admins can change user roles' },
        { status: 403 }
      );
    }

    // Don't allow direct password updates through this route
    if (body.password) {
      delete body.password;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE user (admin only)
async function deleteHandler(req: AuthRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete users' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = params;

    // Prevent deleting yourself
    if (req.user?.userId === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const GET = authenticate(getHandler);
export const PATCH = authenticate(patchHandler);
export const DELETE = authenticate(deleteHandler);
