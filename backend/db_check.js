const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        return;
    }

    // Parse DATABASE_URL: mysql://user:password@host:port/database
    const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = dbUrl.match(regex);

    if (!match) {
        console.error('Invalid DATABASE_URL format');
        return;
    }

    const [_, user, password, host, port, database] = match;

    console.log(`Attempting to connect to MySQL as ${user}...`);

    try {
        // Connect without database first to check if we can create it
        const connection = await mysql.createConnection({
            host,
            port: parseInt(port),
            user,
            password
        });

        console.log('✅ Connected to MySQL successfully!');

        // Check if database exists
        const [rows] = await connection.execute(`SHOW DATABASES LIKE '${database}'`);
        
        if (rows.length > 0) {
            console.log(`✅ Database '${database}' already exists.`);
        } else {
            console.log(`Creating database '${database}'...`);
            await connection.execute(`CREATE DATABASE ${database}`);
            console.log(`✅ Database '${database}' created successfully.`);
        }

        await connection.end();
        console.log('Process complete.');
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        if (err.message.includes('Access denied')) {
            console.log('Please check your root password.');
        }
    }
}

checkDatabase();
