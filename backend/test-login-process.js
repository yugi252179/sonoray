const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function test() {
  try {
    const email = 'admin@sonoray.com';
    const password = 'admin';
    
    console.log("🔍 1. Fetching user:", email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("❌ User not found!");
      return;
    }
    console.log("✅ User found in DB! ID:", user.id);

    console.log("🔑 2. Comparing password 'admin' with hash...");
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log("⚖️ Password match result:", isMatch);

    console.log("📋 3. Fetching linked employee profile...");
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    console.log("✅ Employee found:", employee ? employee.id : "None");

    console.log("🎟️ 4. Signing JWT token...");
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        employeeId: employee?.id || null
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );
    console.log("🎉 JWT Token signed successfully! Token length:", token.length);
  } catch (error) {
    console.error("❌ PROCESS CRASHED!");
    console.error("Error details:", error.message || error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
