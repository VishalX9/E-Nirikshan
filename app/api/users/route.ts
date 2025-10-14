import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

// GET all users (admin only)
async function getHandler(req: AuthRequest) {
  try {
    // Only admins can fetch all users
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const department = searchParams.get('department');

    // Build query
    const query: any = {};
    if (role) query.role = role;
    if (department) query.department = department;

    // Fetch users, excluding password field
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      data: users,
      users: users // For backward compatibility
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin only)
async function postHandler(req: AuthRequest) {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can create users' },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const user = await User.create(body);
    
    // Return user without password
    const userWithoutPassword = user.toObject();
    delete (userWithoutPassword as any).password;

    return NextResponse.json(
      { success: true, data: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Admin updates employerType for an employee
async function patchHandler(req: AuthRequest) {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update users' },
        { status: 403 }
      );
    }

    await dbConnect();
    const { userId, employerType } = await req.json();
    if (!userId || !employerType || !['Field', 'HQ'].includes(employerType)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(userId, { employerType }, { new: true }).select('-password');
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(getHandler);
export const POST = authenticate(postHandler);
export const PATCH = authenticate(patchHandler);
