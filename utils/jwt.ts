import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-dev';

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET environment variable is not set. Using fallback secret for development.');
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  employerType?: 'Field' | 'HQ';
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
