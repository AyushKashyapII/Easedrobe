import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ws from 'ws';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

// Configure neon for WebSocket support
neonConfig.webSocketConstructor = ws;

async function testConnection() {
    console.log('Testing Neon PostgreSQL connection...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in environment variables');
        return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🔌 Attempting to connect to database...');
        const client = await pool.connect();

        console.log('✅ Successfully connected to database!');

        // Test a simple query
        const result = await client.query('SELECT NOW() as current_time, version() as db_version');
        console.log('📊 Database query successful:');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   Database version:', result.rows[0].db_version.split(' ')[0]);

        client.release();
        await pool.end();

        console.log('🎉 Database connection test completed successfully!');
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
    }
}

testConnection(); 