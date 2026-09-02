import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { requireUser } from './auth.util';

const nameOf = (value: string) => value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\.\./g, '') || 'Folder baru';
@Controller('folders')
export class FolderController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@Req() req: any) { requireUser(req); return this.prisma.folder.findMany({ include: { _count: { select: { files: true, children: true } } }, orderBy: { path: 'asc' } }); }
  @Post() async create(@Req() req: any, @Body() body: { name?: string; parentId?: number | null }) { const user = requireUser(req); const name = nameOf(body.name || ''); const parent = body.parentId ? await this.prisma.folder.findUnique({ where: { id: Number(body.parentId) } }) : null; const path = parent ? `${parent.path}/${name}` : name; const folder = await this.prisma.folder.create({ data: { name, path, parentId: parent?.id } }); await fs.mkdir(join(process.env.STORAGE_PATH || './storage', path), { recursive: true }); await this.prisma.activityLog.create({ data: { action: 'create_folder', source: 'v1', userId: Number(user.sub), metadata: { folderId: folder.id } } }); return folder; }
  @Patch(':id') async rename(@Req() req: any, @Param('id') id: string, @Body('name') value: string) { requireUser(req); const folder = await this.prisma.folder.findUnique({ where: { id: Number(id) } }); if (!folder) return null; return this.prisma.folder.update({ where: { id: folder.id }, data: { name: nameOf(value), path: folder.parentId ? `${folder.path.split('/').slice(0, -1).join('/')}/${nameOf(value)}` : nameOf(value) } }); }
  @Delete(':id') async remove(@Req() req: any, @Param('id') id: string) { requireUser(req); const folder = await this.prisma.folder.findUnique({ where: { id: Number(id) }, include: { _count: { select: { files: true, children: true } } } }); if (!folder) return null; if (folder._count.files || folder._count.children) return { success: false, message: 'Folder harus kosong sebelum dihapus' }; await this.prisma.folder.delete({ where: { id: folder.id } }); return { success: true }; }
}
