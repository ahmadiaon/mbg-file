import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { FilesController } from './files.controller';
import { FolderController } from './folder.controller';

@Module({ controllers: [AuthController, FilesController, FolderController], providers: [PrismaService] })
export class AppModule {}
