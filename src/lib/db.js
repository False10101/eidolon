import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// For TiDB Cloud Serverless, download the CA certificate from:
// https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-tier-clusters
const caCertPath = path.join(process.cwd(), 'isrgrootx1.pem');

// Create the connection pool with SSL
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT || 4000,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  timezone: 'Asia/Bangkok', 

  
  // SSL configuration
  ssl: {
    ca: fs.readFileSync(caCertPath),
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  
  // Connection pool settings
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});