import { db } from './db';

export async function queryWithRetry(query, values) {
  try {
    return await db.query(query, values);
  } catch (err) {
    // If it's a timeout or connection reset error, try one more time
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      console.log('Database connection timed out. Retrying once...');
      return await db.query(query, values);
    }
    // For all other errors, throw them immediately
    throw err;
  }
}