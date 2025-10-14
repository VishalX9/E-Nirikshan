import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { generateToken } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    // Do not validate name/role/employerType at login; admin assigns employer type separately
    
    const token = generateToken({
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
      employerType: user.employerType as any
    });
    
    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employerType: user.employerType
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
