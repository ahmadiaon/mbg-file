import { Controller, Get, Post, Req, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('files')
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list() { const files = await this.prisma.file.findMany({ orderBy: { createdAt: 'desc' } }); return files.map((f) => ({ ...f, size: Number(f.size) })); }
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: async (_req, _file, cb) => { const dir = join(process.env.STORAGE_PATH || './storage'); await fs.mkdir(dir, { recursive: true }); cb(null, dir); }, filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`) }) }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ada');
    const sha256 = createHash('sha256').update(await fs.readFile(file.path)).digest('hex');
    const saved = await this.prisma.file.create({ data: { filename: file.filename, originalFilename: file.originalname, storagePath: file.path, mimeType: file.mimetype, size: BigInt(file.size), sha256, source: 'v1' } });
    await this.prisma.activityLog.create({ data: { action: 'upload', source: 'v1', fileId: saved.id } });
    return { ...saved, size: Number(saved.size) };
  }
  @Get(':id/download') async download(@Req() req: any, @Res() res: Response) { const file = await this.prisma.file.findUnique({ where: { id: Number(req.params.id) } }); if (!file) return res.status(404).json({ message: 'File tidak ditemukan' }); res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`); return createReadStream(file.storagePath).pipe(res); }
}
