import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNotifications() {
  const targetEmail = 'admin@ultaserve.com';
  console.log(`[SEED] Searching for target user: ${targetEmail}...`);

  const user = await prisma.user.findUnique({
    where: { email: targetEmail }
  });

  if (!user) {
    console.error(`[SEED] User ${targetEmail} not found! Please run the prisma seed or register first.`);
    return;
  }

  const userId: string = user.id;

  console.log(`[SEED] Found user: ${user.email} (ID: ${userId}). Clearing old notifications...`);
  await prisma.notification.deleteMany({
    where: { userId }
  });

  console.log(`[SEED] Inserting beautiful Zoho-style notifications...`);

  const notificationsData = [
    {
      userId,
      title: 'New Service Ticket Assigned',
      message: 'A breakdown request has been assigned to you at City General Hospital for the Sonoscape S22 Ultrasound system (SN: SC-8902).',
      type: 'INFO',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    },
    {
      userId,
      title: 'Urgent Leave Request Approved',
      message: 'Your medical leave request for the afternoon session on June 3rd has been reviewed and approved by Human Resources.',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      userId,
      title: 'Critical Stock Alert',
      message: 'Warehouse Sector 4 reports low inventory levels for the 3C6C Convex Probe. Only 1 spare unit remains in active stock.',
      type: 'WARNING',
      isRead: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      userId,
      title: 'Monthly Performance Report Available',
      message: 'Your field attendance, service ticket resolution ratios, and client reviews for May 2026 are compiled and ready for review in your report panel.',
      type: 'INFO',
      isRead: true, // Marked as read already
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    }
  ];

  for (const item of notificationsData) {
    const created = await prisma.notification.create({
      data: item
    });
    console.log(`[SEED] Created notification: "${created.title}"`);
  }

  console.log(`[SEED] Success! Seeded ${notificationsData.length} notifications successfully for ${targetEmail}.`);
}

seedNotifications()
  .catch((err) => {
    console.error('[SEED] Error during seeding:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
