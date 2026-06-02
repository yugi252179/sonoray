const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log("🔍 Checking DATABASE_URL from .env:", process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function test() {
  try {
    console.log("🛰️ Connecting to database...");
    const count = await prisma.user.count();
    console.log("🎉 SUCCESS! Connected to database.");
    console.log("👥 Total users in DB:", count);
    
    if (count === 0) {
      console.log("⚠️ Warning: No users found. Did the seeding run?");
    } else {
      const users = await prisma.user.findMany({ select: { email: true, role: true } });
      console.log("📋 Users inside DB:", users);
    }
  } catch (err) {
    console.error("❌ ERROR: Database connection failed!");
    console.error("Error details:", err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
