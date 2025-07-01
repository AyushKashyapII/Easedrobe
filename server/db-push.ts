import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

// Function to push schema to database
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Starting migration...");
  try {
    // This will create all tables and relations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);

    console.log("Sessions table created.");

    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        recommendations_generated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Users table created.");

    // Create clothing_items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clothing_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_data TEXT NOT NULL,
        rating INTEGER,
        tags TEXT[],
        caption TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Clothing items table created.");

    // Create outfits table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS outfits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_data TEXT NOT NULL,
        rating INTEGER,
        ai_generated BOOLEAN DEFAULT FALSE,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        item_ids INTEGER[],
        analysis TEXT
      );
    `);

    console.log("Outfits table created.");

    // Create shopping_items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_data TEXT NOT NULL,
        rating INTEGER,
        analysis TEXT NOT NULL,
        matching_item_ids INTEGER[],
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Shopping items table created.");

    // Create recommendations table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        item_ids INTEGER[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        feedback TEXT
      );
    `);

    console.log("Recommendations table created.");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});