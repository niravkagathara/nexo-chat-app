// Read admin/superadmin users from the DB
process.env.DATABASE_URL = 'file:./prisma/dev.db';

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: { role: { in: ['superadmin', 'admin'] } },
    select: { id: true, email: true, name: true, role: true },
    take: 5
  });
  console.log('Admin/Superadmin users:\n', JSON.stringify(users, null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
