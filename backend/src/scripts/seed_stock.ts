import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = [
    {
      stockId: 'US-V8-001',
      machineName: 'Samsung V8 Ultrasound',
      category: 'MACHINE',
      quantity: 12,
      warehouseLocation: 'Floor 1, A1',
      stockStatus: 'IN_STOCK',
      unitPrice: 450000
    },
    {
      stockId: 'US-PROBE-C1',
      machineName: 'Convex Probe C1-6',
      category: 'SPARE_PART',
      quantity: 3,
      warehouseLocation: 'Floor 2, B4',
      stockStatus: 'IN_STOCK',
      unitPrice: 85000
    },
    {
      stockId: 'US-GEL-5L',
      machineName: 'Ultrasound Gel 5L',
      category: 'CONSUMABLE',
      quantity: 50,
      warehouseLocation: 'Floor 1, Storage C',
      stockStatus: 'IN_STOCK',
      unitPrice: 1200
    }
  ];

  for (const item of items) {
    await prisma.stock.create({
      data: item
    });
  }

  console.log('Seed stock data added successfully');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
