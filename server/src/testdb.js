require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log('Connecting to database...');
    console.log('URL starts with:', process.env.DATABASE_URL?.substring(0, 40));
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('SUCCESS! Database connected at:', result.rows[0].current_time);
    await pool.end();
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error('Error code:', err.code);
    await pool.end();
  }
}

test();