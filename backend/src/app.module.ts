import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { FilesController, PublicShareController } from './files.controller';
import { FolderController } from './folder.controller';
import { TokensController } from './tokens.controller';
import { ExternalController } from './external.controller';

@Module({ controllers: [AuthController, FilesController, PublicShareController, FolderController, TokensController, ExternalController], providers: [PrismaService] })
export class AppModule {}
