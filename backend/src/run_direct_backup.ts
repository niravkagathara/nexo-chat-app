import * as dotenv from 'dotenv';
import * as path from 'path';
// Load from backend root using relative path from compiled folder, and fallback to cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaService } from './prisma.service';
import { BackupService } from './backup/backup.service';

async function test() {
  console.log('Initializing PrismaService and BackupService...');
  const prisma = new PrismaService();
  const backup = new BackupService(prisma);
  console.log('Running backup...');
  try {
    const res = await backup.runBackup();
    console.log('Backup result:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Backup failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
