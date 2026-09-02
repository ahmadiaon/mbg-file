import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export function requireUser(req: any) {
  const value = req.headers.authorization as string | undefined;
  if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Token diperlukan');
  try { return jwt.verify(value.slice(7), process.env.JWT_SECRET || 'development-secret') as unknown as { sub: number }; }
  catch { throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa'); }
}
