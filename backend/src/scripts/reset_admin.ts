import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.user.update({
    where: { email: 'admin@admin.com' },
    data: { passwordHash }
  });
  console.log('Password reset to "admin" for admin@admin.com');
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
