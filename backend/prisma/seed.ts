import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial default accounts...');
  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('Password123!', saltRounds);

  const users = [
    {
      email: 'admin@ammunation.com',
      name: 'Commander Admin',
      role: Role.ADMIN,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'staff@ammunation.com',
      name: 'Agent Staff',
      role: Role.STAFF,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'warehouse@ammunation.com',
      name: 'Operator Warehouse',
      role: Role.WAREHOUSE_OPERATOR,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'customer@ammunation.com',
      name: 'John Customer',
      role: Role.CUSTOMER,
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    console.log(`Seeded account: ${u.email} [${u.role}]`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
