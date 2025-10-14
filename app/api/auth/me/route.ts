import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { authenticate, AuthRequest } from '@/middleware/auth';

async function handler(req: AuthRequest) {
  try {
    await dbConnect();
    
    const user = await User.findById(req.user?.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateHandler(req: AuthRequest) {
  try {
    await dbConnect();

    const { name, department, position, password, themePreference } = await req.json();
    const updates: Record<string, unknown> = {};

    if (name) updates.name = name;
    if (typeof department === 'string') updates.department = department;
    if (typeof position === 'string') updates.position = position;
    if (themePreference && ['light', 'dark', 'system'].includes(themePreference)) {
      updates.themePreference = themePreference;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user?.userId, updates, {
      new: true,
      runValidators: true,
      select: '-password',
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = authenticate(handler);
export const PATCH = authenticate(updateHandler);
