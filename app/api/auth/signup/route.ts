import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import { generateToken } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
<<<<<<< HEAD
    const { name, email, password, role, employerType } = await req.json();
=======
    const { name, email, password, role } = await req.json();
>>>>>>> 2c9cc2f49eb7480abd62080a8247ebd39e4e0f87
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
<<<<<<< HEAD
    // Validate role-specific requirements
    const userRole = role || 'employee';
    if (userRole === 'employee' && !employerType) {
      return NextResponse.json({ error: 'Employer type is required for employees' }, { status: 400 });
    }
    
=======
>>>>>>> 2c9cc2f49eb7480abd62080a8247ebd39e4e0f87
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
<<<<<<< HEAD
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
=======
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'employee'
    });
>>>>>>> 2c9cc2f49eb7480abd62080a8247ebd39e4e0f87
    
    const token = generateToken({
      userId: user._id!.toString(),
      email: user.email,
<<<<<<< HEAD
      role: user.role,
      employerType: user.employerType as any
=======
      role: user.role
>>>>>>> 2c9cc2f49eb7480abd62080a8247ebd39e4e0f87
    });
    
    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
<<<<<<< HEAD
        role: user.role,
        employerType: user.employerType
=======
        role: user.role
>>>>>>> 2c9cc2f49eb7480abd62080a8247ebd39e4e0f87
      }
    }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
