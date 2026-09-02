import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('folders')
export class FolderController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() { return this.prisma.folder.findMany({ orderBy: { path: 'asc' } }); }
  @Post() create(@Body() body: { name?: string; path?: string }) { const path = body.path || body.name || ''; return this.prisma.folder.create({ data: { name: body.name || path, path } }); }
}
