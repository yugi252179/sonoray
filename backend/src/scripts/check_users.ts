import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isActive: true
    }
  });
  console.log('---USER_DATA_START---');
  console.log(JSON.stringify(users, null, 2));
  console.log('---USER_DATA_END---');
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
