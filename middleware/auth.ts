import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';

export interface AuthRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
    employerType?: 'Field' | 'HQ';
  };
}

/**
 * Generic authentication middleware
 * T = context type (e.g., { params: { id: string } })
 */
export function authenticate<T = any>(
  handler: (req: AuthRequest, context: T) => Promise<NextResponse>
) {
  return async (req: AuthRequest, context: T) => {
    try {
      const authHeader = req.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      req.user = decoded;

      return handler(req, context);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin<T = any>(
  handler: (req: AuthRequest, context: T) => Promise<NextResponse>
) {
  return authenticate(async (req: AuthRequest, context: T) => {
    if (req.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}
