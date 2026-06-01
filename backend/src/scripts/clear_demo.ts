import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing demo data...');

  // 1. Find the admin employee
  const user = await prisma.user.findUnique({
    where: { email: 'admin@sonoray.com' },
    include: { employee: true }
  });

  if (user && user.employee) {
    // 2. Delete attendance for this employee
    const deletedAttendance = await prisma.attendance.deleteMany({
      where: { employeeId: user.employee.id }
    });
    console.log(`✅ Deleted ${deletedAttendance.count} attendance records.`);

    // Optional: If you want to delete the employee profile itself:
    // await prisma.employee.delete({ where: { id: user.employee.id } });
    // console.log('✅ Employee profile removed.');
  }

  console.log('✨ Database is clean!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
