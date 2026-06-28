import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [BackupService, PrismaService],
  exports: [BackupService],
})
export class BackupModule {}
