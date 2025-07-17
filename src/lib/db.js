import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  keepAlive: true,
  keepAliveInitialDelay: 1200000,
});

db.getConnection()
  .then(() => {
    console.log('Database connected successfully.');
  })
  .catch(err => {
    console.error('Database connection error:', err);
    return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500 });
  });