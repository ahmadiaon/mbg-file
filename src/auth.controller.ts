import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    const user = await this.prisma.user.findUnique({ where: { username: body.username || '' } });
    if (!user || !(await bcrypt.compare(body.password || '', user.passwordHash))) throw new UnauthorizedException('Username atau password salah');
    const token = jwt.sign({ sub: user.id, username: user.username, role: user.role, unit: user.unit }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '7d' });
    return { access_token: token, user: { id: user.id, username: user.username, name: user.name, role: user.role, unit: user.unit } };
  }
}
