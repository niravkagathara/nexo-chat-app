import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

function findDbPath(): string {
  // 1. Try relative to process.cwd() (if launched inside backend directory)
  if (existsSync(join(process.cwd(), 'dev.db'))) {
    return join(process.cwd(), 'dev.db');
  }
  // 2. Try nested backend (if launched from workspace root)
  if (existsSync(join(process.cwd(), 'backend', 'dev.db'))) {
    return join(process.cwd(), 'backend', 'dev.db');
  }
  // 3. Climb up from __dirname
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'dev.db'))) {
      return join(dir, 'dev.db');
    }
    if (existsSync(join(dir, 'backend', 'dev.db'))) {
      return join(dir, 'backend', 'dev.db');
    }
    dir = join(dir, '..');
  }
  // 4. Default fallback
  return join(process.cwd(), 'dev.db');
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbPath = findDbPath();
    console.log('Connecting to SQLite database at:', dbPath);
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.seed();
  }

  async seed() {
    try {
      const actions = ['manage_users', 'manage_rooms', 'manage_files', 'trigger_backup'];
      for (const action of actions) {
        await this.rolePermission.upsert({
          where: {
            role_action: {
              role: 'admin',
              action,
            },
          },
          update: {},
          create: {
            role: 'admin',
            action,
            allowed: false,
          },
        });
      }
      console.log('Seeded default role permissions for admin.');

      // Ensure default groups 'general' and 'graphics' exist
      const defaultGroupNames = ['general', 'graphics'];
      for (const name of defaultGroupNames) {
        const existing = await this.room.findFirst({
          where: { name, isGroup: true },
        });
        if (!existing) {
          await this.room.create({
            data: { name, isGroup: true },
          });
          console.log(`Seeded default group: ${name}`);
        }
      }

      // Remove any 'myspace' group
      const myspaceGroups = await this.room.findMany({
        where: { name: 'myspace', isGroup: true },
      });
      for (const group of myspaceGroups) {
        await this.room.delete({
          where: { id: group.id },
        });
        console.log(`Removed 'myspace' group (ID: ${group.id})`);
      }
    } catch (err) {
      console.error('Failed to seed default role permissions/groups:', err);
    }
  }

}
