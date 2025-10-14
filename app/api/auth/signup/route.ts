import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { generateToken } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const { name, email, password, role, employerType } = await req.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate role-specific requirements
    const userRole = role || 'employee';
    if (userRole === 'employee' && !employerType) {
      return NextResponse.json({ error: 'Employer type is required for employees' }, { status: 400 });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare user data based on role
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role: userRole
    };
    
    // Only add employerType for employees
    if (userRole === 'employee') {
      // Convert lowercase to uppercase to match schema enum
      userData.employerType = employerType === 'field' ? 'Field' : employerType === 'hq' ? 'HQ' : employerType;
    }
    
    const user = await User.create(userData);
    
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
    }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
