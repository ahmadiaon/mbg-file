import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from './prisma.service';
import { requireUser } from './auth.util';

@Controller('tokens')
export class TokensController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const user = requireUser(req);
    return this.prisma.apiToken.findMany({
      where: { userId: Number(user.sub) },
      select: { id: true, name: true, status: true, expiresAt: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name?: string; expiresAt?: string }) {
    const user = requireUser(req);
    const token = `mbg_${randomBytes(32).toString('hex')}`;
    const saved = await this.prisma.apiToken.create({
      data: {
        name: (body.name || 'External upload').trim() || 'External upload',
        tokenHash: createHash('sha256').update(token).digest('hex'),
        userId: Number(user.sub),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return {
      id: saved.id,
      name: saved.name,
      token,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      warning: 'Simpan token ini sekarang. Nilai lengkap hanya ditampilkan sekali.',
    };
  }

  @Delete(':id')
  async revoke(@Req() req: any, @Param('id') id: string) {
    const user = requireUser(req);
    const token = await this.prisma.apiToken.findFirst({ where: { id: Number(id), userId: Number(user.sub) } });
    if (!token) throw new NotFoundException('Token tidak ditemukan');
    await this.prisma.apiToken.update({ where: { id: token.id }, data: { status: 'REVOKED' } });
    return { success: true };
  }
}
