import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { FilesController, PublicShareController } from './files.controller';
import { FolderController } from './folder.controller';

@Module({ controllers: [AuthController, FilesController, PublicShareController, FolderController], providers: [PrismaService] })
export class AppModule {}
