import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma.service';

export function bearerValue(req: any) {
  const authorization = req.headers.authorization as string | undefined;
  const apiToken = req.headers['x-api-token'] as string | undefined;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  if (apiToken) return String(apiToken).trim();
  return '';
}

export function requireUser(req: any) {
  const token = bearerValue(req);
  if (!token) throw new UnauthorizedException('Token diperlukan');
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as unknown as { sub: number };
  } catch {
    throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa');
  }
}

export async function requireAuth(req: any, prisma: PrismaService) {
  const token = bearerValue(req);
  if (!token) throw new UnauthorizedException('Token diperlukan');
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as unknown as { sub: number };
  } catch {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const apiToken = await prisma.apiToken.findFirst({ where: { tokenHash, status: 'ACTIVE' } });
    if (!apiToken || (apiToken.expiresAt && apiToken.expiresAt < new Date())) {
      throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa');
    }
    await prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } });
    return { sub: apiToken.userId };
  }
}
