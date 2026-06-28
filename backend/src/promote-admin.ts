import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

function findDbPath(): string {
  if (existsSync(join(process.cwd(), 'dev.db'))) {
    return join(process.cwd(), 'dev.db');
  }
  if (existsSync(join(process.cwd(), 'backend', 'dev.db'))) {
    return join(process.cwd(), 'backend', 'dev.db');
  }
  return join(process.cwd(), 'dev.db');
}

const dbPath = findDbPath();
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];

  try {
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true }
    });

    if (!email) {
      console.log('Existing users in database:');
      console.table(allUsers);
      console.log('Usage: npx ts-node src/promote-admin.ts <email>');
      process.exit(0);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      console.log('Existing users in database:');
      console.table(allUsers);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'superadmin' },
    });

    console.log(`[Success] Promoted user "${updated.name}" (${email}) to "superadmin".`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
