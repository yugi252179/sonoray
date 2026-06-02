import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  // 1. Create or reset the Super Admin user
  const passwordHash = await bcrypt.hash('admin', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@sonoray.com' },
    update: { passwordHash, isActive: true, role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@sonoray.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    }
  });
  console.log(`✅ Admin user ready: admin@sonoray.com / password: admin`);

  // 2. Create a Department if it doesn't exist
  const dept = await prisma.department.upsert({
    where: { name: 'Service Department' },
    update: {},
    create: { name: 'Service Department' }
  });

  // 3. Create Employee profile for the admin
  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      departmentId: dept.id,
      firstName: 'Admin',
      lastName: 'User',
      designation: 'Senior Engineer'
    },
    create: {
      userId: user.id,
      departmentId: dept.id,
      firstName: 'Admin',
      lastName: 'User',
      designation: 'Senior Engineer',
      phone: '1234567890',
      joiningDate: new Date('2024-01-01')
    }
  });

  console.log(`✅ Employee profile linked: ${employee.id}`);

  // 4. Seed Attendance for May (1st to 16th)
  console.log('📅 Generating attendance for May...');
  const attendanceRecords = [];
  
  for (let i = 1; i <= 16; i++) {
    // Skip Sundays
    const date = new Date(Date.UTC(2026, 4, i)); // May is index 4
    if (date.getUTCDay() === 0) continue; 

    const punchIn = new Date(date);
    punchIn.setUTCHours(9, 0, 0, 0); // 9:00 AM

    const punchOut = new Date(date);
    punchOut.setUTCHours(17, 30, 0, 0); // 5:30 PM

    attendanceRecords.push(
      prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: date
          }
        },
        update: {
          status: 'PRESENT',
          punchInTime: punchIn,
          punchOutTime: punchOut,
          month: 5,
          year: 2026
        },
        create: {
          employeeId: employee.id,
          date: date,
          status: 'PRESENT',
          punchInTime: punchIn,
          punchOutTime: punchOut,
          month: 5,
          year: 2026
        }
      })
    );
  }

  await Promise.all(attendanceRecords);
  console.log('🚀 Demo attendance seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
