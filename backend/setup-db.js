require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log("⏳ Creating messages table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        topic VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("⏳ Creating reactions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        reaction VARCHAR(50) NOT NULL,
        UNIQUE(message_id, username)
      );
    `);

    console.log("✅ Database tables created successfully!");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  } finally {
    pool.end();
  }
}

setupDatabase();