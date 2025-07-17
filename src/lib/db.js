import mysql from 'mysql2/promise';

// Create the connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,  // The correct option for mysql2
  keepAliveInitialDelay: 0,  // Start pings immediately
});

// Verify connection on startup
db.getConnection()
  .then((conn) => {
    console.log('Database connected successfully');
    conn.release(); // Release immediately after test
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Active connection maintenance
setInterval(() => {
  db.query('SELECT 1').catch(err => {
    console.error('Keep-alive ping failed:', err);
  });
}, 30000); // Ping every 30 seconds