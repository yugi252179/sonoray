const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

async function importStock() {
    try {
        const filePath = path.join(__dirname, 'stock_data.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1); // Get the first worksheet
        const data = [];

        // Skip the header row (row 1)
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            
            const values = row.values;
            // ExcelJS row.values is 1-indexed, values[1] is column A
            data.push({
                'Stock ID': values[1],
                'Machine Name': values[2],
                'Category': values[3],
                'Available Quantity': values[4],
                'Warehouse Location': values[5],
                'Purchase Date': values[6],
                'Supplier Name': values[7],
                'Unit Price (INR)': values[8],
                'Stock Status': values[9],
            });
        });

        console.log(`Starting import of ${data.length} records...`);

        for (const row of data) {
            // Parse Date: DD-MM-YYYY
            let purchaseDate = null;
            if (row['Purchase Date']) {
                // Handle both String and Date objects from Excel
                if (row['Purchase Date'] instanceof Date) {
                    purchaseDate = row['Purchase Date'];
                } else {
                    const parts = row['Purchase Date'].split('-');
                    if (parts.length === 3) {
                        purchaseDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                }
            }

            await prisma.stock.create({
                data: {
                    stockId: row['Stock ID']?.toString(),
                    machineName: row['Machine Name'],
                    category: row['Category'],
                    quantity: parseInt(row['Available Quantity']),
                    warehouseLocation: row['Warehouse Location'],
                    purchaseDate: purchaseDate,
                    supplierName: row['Supplier Name'],
                    unitPrice: parseFloat(row['Unit Price (INR)']),
                    stockStatus: row['Stock Status'],
                }
            });
        }

        console.log('✅ Import to machine_stock table successful!');

        // Also import to the dataset table for completeness
        for (const row of data) {
            await prisma.ultaserveStockAndHrDataset.create({
                data: {
                    stockId: row['Stock ID']?.toString(),
                    machineName: row['Machine Name'],
                    category: row['Category'],
                    availableQuantity: parseInt(row['Available Quantity']),
                    warehouseLocation: row['Warehouse Location'],
                    purchaseDate: row['Purchase Date'] instanceof Date ? row['Purchase Date'].toISOString() : row['Purchase Date'],
                    supplierName: row['Supplier Name'],
                    unitPrice: parseInt(row['Unit Price (INR)']),
                    stockStatus: row['Stock Status'],
                }
            });
        }
        
        console.log('✅ Import to dataset table successful!');

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importStock();
