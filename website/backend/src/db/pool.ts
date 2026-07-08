import { Pool, types } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// DATE (OID 1082) defaults to a JS Date at local midnight, which then
// serializes via toISOString() shifted into the previous UTC day on any
// server not running in UTC (e.g. Asia/Colombo, UTC+5:30). Keep the raw
// "YYYY-MM-DD" string instead so dates round-trip exactly as stored.
types.setTypeParser(1082, (value) => value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
