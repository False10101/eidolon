import postgres from 'postgres';

// Initialize the connection pool
export const sql = postgres(process.env.DATABASE_URL, {
  // It automatically uses process.env.DATABASE_URL
  // These are optional tweaks for a 4GB VPS
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  types: {
    date: {
      to: 1184,
      from: [1082, 1083, 1114, 1184],
      serialize: (x) => x,
      parse: (x) => x, // return raw string, don't let postgres.js convert it
    }
  }
});