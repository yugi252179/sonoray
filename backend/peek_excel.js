const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'stock_data.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet Name:', sheetName);
console.log('Headers:', Object.keys(data[0]));
console.log('First 2 rows:', JSON.stringify(data.slice(0, 2), null, 2));
console.log('Total rows:', data.length);
