import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash, randomBytes } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import { requireUser } from './auth.util';

const storageRoot = () => join(process.env.STORAGE_PATH || './storage');
const cleanName = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\.\./g, '') || 'Tanpa nama';
const output = (file: any) => ({ ...file, size: Number(file.size) });

@Controller('files')
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Req() req: any, @Query('q') q?: string, @Query('folderId') folderId?: string) {
    requireUser(req);
    let folderIds: number[] | undefined;
    if (folderId) {
      const allFolders = await this.prisma.folder.findMany({ select: { id: true, parentId: true } });
      folderIds = [Number(folderId)];
      for (let index = 0; index < folderIds.length; index += 1) {
        folderIds.push(...allFolders.filter((folder) => folder.parentId === folderIds![index]).map((folder) => folder.id));
      }
    }
    const files = await this.prisma.file.findMany({ where: { ...(folderIds ? { folderId: { in: folderIds } } : {}), ...(q ? { originalFilename: { contains: q } } : {}) }, include: { folder: true }, orderBy: { createdAt: 'desc' } });
    return files.map(output);
  }
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: async (_req, _file, cb) => { await fs.mkdir(storageRoot(), { recursive: true }); cb(null, storageRoot()); }, filename: (_req, file, cb) => cb(null, `${Date.now()}-${cleanName(file.originalname)}`) }) }))
  async upload(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body('folderId') folderId?: string) {
    const user = requireUser(req); if (!file) throw new BadRequestException('File tidak ada');
    const saved = await this.prisma.file.create({ data: { filename: file.filename, originalFilename: file.originalname, storagePath: file.path, mimeType: file.mimetype, size: BigInt(file.size), sha256: createHash('sha256').update(await fs.readFile(file.path)).digest('hex'), source: 'v1', folderId: folderId ? Number(folderId) : null, uploadedBy: Number(user.sub) } });
    await this.prisma.activityLog.create({ data: { action: 'upload', source: 'v1', fileId: saved.id, userId: Number(user.sub) } }); return output(saved);
  }
  @Patch(':id') async rename(@Req() req: any, @Param('id') id: string, @Body('name') name: string) { const user = requireUser(req); const file = await this.prisma.file.findUnique({ where: { id: Number(id) } }); if (!file) throw new NotFoundException('File tidak ditemukan'); const updated = await this.prisma.file.update({ where: { id: file.id }, data: { originalFilename: cleanName(name) } }); await this.prisma.activityLog.create({ data: { action: 'rename', source: 'v1', fileId: file.id, userId: Number(user.sub) } }); return output(updated); }
  @Patch(':id/move') async move(@Req() req: any, @Param('id') id: string, @Body('folderId') folderId: number | null) { const user = requireUser(req); const file = await this.prisma.file.update({ where: { id: Number(id) }, data: { folderId: folderId || null } }); await this.prisma.activityLog.create({ data: { action: 'move', source: 'v1', fileId: file.id, userId: Number(user.sub) } }); return output(file); }
  @Post(':id/share') async share(@Req() req: any, @Param('id') id: string, @Body('expiresAt') expiresAt?: string) { const user = requireUser(req); const file = await this.prisma.file.findUnique({ where: { id: Number(id) } }); if (!file) throw new NotFoundException('File tidak ditemukan'); const updated = await this.prisma.file.update({ where: { id: file.id }, data: { shareToken: file.shareToken || randomBytes(24).toString('hex'), shareEnabled: true, shareExpiresAt: expiresAt ? new Date(expiresAt) : null } }); await this.prisma.activityLog.create({ data: { action: 'share', source: 'v1', fileId: file.id, userId: Number(user.sub) } }); return { ...output(updated), shareUrl: `${process.env.APP_URL || `http://localhost:${process.env.PORT || 8081}`}/api/v1/public/share/${updated.shareToken}` }; }
  @Delete(':id/share') async unshare(@Req() req: any, @Param('id') id: string) { const user = requireUser(req); const file = await this.prisma.file.update({ where: { id: Number(id) }, data: { shareEnabled: false } }); await this.prisma.activityLog.create({ data: { action: 'unshare', source: 'v1', fileId: file.id, userId: Number(user.sub) } }); return { success: true }; }
  @Delete(':id') async remove(@Req() req: any, @Param('id') id: string) { const user = requireUser(req); const file = await this.prisma.file.findUnique({ where: { id: Number(id) } }); if (!file) throw new NotFoundException('File tidak ditemukan'); await fs.rm(file.storagePath, { force: true }); await this.prisma.file.delete({ where: { id: file.id } }); await this.prisma.activityLog.create({ data: { action: 'delete', source: 'v1', userId: Number(user.sub), metadata: { fileId: file.id, name: file.originalFilename } } }); return { success: true }; }
  @Get(':id/download') async download(@Req() req: any, @Param('id') id: string, @Res() res: Response) { requireUser(req); const file = await this.prisma.file.findUnique({ where: { id: Number(id) } }); if (!file) return res.status(404).json({ message: 'File tidak ditemukan' }); res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`); return createReadStream(file.storagePath).pipe(res); }
}

@Controller('public/share')
export class PublicShareController {
  constructor(private readonly prisma: PrismaService) {}
  @Get(':token') async download(@Param('token') token: string, @Res() res: Response) { const file = await this.prisma.file.findUnique({ where: { shareToken: token } }); if (!file || !file.shareEnabled || (file.shareExpiresAt && file.shareExpiresAt < new Date())) return res.status(404).json({ message: 'Link tidak ditemukan atau sudah kedaluwarsa' }); res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`); return createReadStream(file.storagePath).pipe(res); }
}
