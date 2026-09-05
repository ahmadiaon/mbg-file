import { BadRequestException, Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { requireAuth } from './auth.util';

const storageRoot = () => join(process.env.STORAGE_PATH || './storage');
const cleanName = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\.\./g, '') || 'Tanpa nama';
const output = (file: any) => ({ ...file, size: Number(file.size) });

@Controller('external')
export class ExternalController {
  constructor(private readonly prisma: PrismaService) {}

  private async folderFromPath(pathValue?: string) {
    const parts = (pathValue || '').split('/').map((part) => cleanName(part)).filter(Boolean);
    let parentId: number | null = null;
    let folder: { id: number; path: string } | null = null;
    for (const name of parts) {
      const nextPath: string = folder ? `${folder.path}/${name}` : name;
      folder = await this.prisma.folder.upsert({
        where: { path: nextPath },
        update: {},
        create: { name, path: nextPath, parentId },
      });
      await fs.mkdir(join(storageRoot(), nextPath), { recursive: true });
      parentId = folder.id;
    }
    return folder?.id || null;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: async (_req, _file, cb) => {
        await fs.mkdir(storageRoot(), { recursive: true });
        cb(null, storageRoot());
      },
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${cleanName(file.originalname)}`),
    }),
  }))
  async upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
    @Body('folderPath') folderPath?: string,
  ) {
    const user = await requireAuth(req, this.prisma);
    if (!file) throw new BadRequestException('File tidak ada');
    const resolvedFolderId = folderId ? Number(folderId) : await this.folderFromPath(folderPath);
    const saved = await this.prisma.file.create({
      data: {
        filename: file.filename,
        originalFilename: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        size: BigInt(file.size),
        sha256: createHash('sha256').update(await fs.readFile(file.path)).digest('hex'),
        source: 'external',
        folderId: resolvedFolderId,
        uploadedBy: Number(user.sub),
      },
    });
    await this.prisma.activityLog.create({
      data: { action: 'upload', source: 'external', fileId: saved.id, userId: Number(user.sub) },
    });
    return output(saved);
  }
}
