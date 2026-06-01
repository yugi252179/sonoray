import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment configurations
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@sonoray.com';
  const password = 'admin'; // Default administrator password
  
  console.log(`🔐 Creating/Resetting Super Admin (${email}) in the database...`);
  
  // Hash the password securely
  const passwordHash = await bcrypt.hash(password, 10);
  
  // 1. Create or Update User record
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isActive: true,
      role: 'SUPER_ADMIN'
    },
    create: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });
  
  console.log(`👤 User account created/updated with ID: ${user.id}`);
  
  // 2. Create Service Department if it doesn't exist
  const dept = await prisma.department.upsert({
    where: { name: 'Service Department' },
    update: {},
    create: { name: 'Service Department' }
  });
  
  // 3. Create or Link corresponding Employee profile
  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      departmentId: dept.id,
      designation: 'Senior Manager'
    },
    create: {
      userId: user.id,
      firstName: 'Admin',
      lastName: 'User',
      departmentId: dept.id,
      designation: 'Senior Manager',
      phone: '1234567890',
      joiningDate: new Date()
    }
  });
  
  console.log(`\n🎉 Success! You can now log in with:`);
  console.log(`   📧 Email: ${email}`);
  console.log(`   🔑 Password: ${password}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error executing script:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
