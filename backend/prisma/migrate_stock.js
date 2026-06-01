const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching data from ultaserve_stock_and_hr_dataset...');
  const dataset = await prisma.ultaserveStockAndHrDataset.findMany();

  console.log(`Found ${dataset.length} records. Starting migration...`);

  for (const item of dataset) {
    // Parse date DD-MM-YYYY to Date object
    let purchaseDate = null;
    if (item.purchaseDate) {
      const [day, month, year] = item.purchaseDate.split('-');
      purchaseDate = new Date(`${year}-${month}-${day}`);
    }

    await prisma.stock.create({
      data: {
        machineName: item.machineName,
        category: item.category,
        quantity: item.availableQuantity,
        warehouseLocation: item.warehouseLocation,
        purchaseDate: purchaseDate,
        supplierName: item.supplierName,
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : 0,
        stockStatus: item.stockStatus,
        stockId: item.stockId || `STK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      }
    });
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
