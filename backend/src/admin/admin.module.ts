import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [AuthModule, BackupModule],
  controllers: [AdminController],
  providers: [PrismaService],
})
export class AdminModule {}
