import { Pool, PoolClient, types } from 'pg';
import { env } from './env';

// Return DATE columns as plain "YYYY-MM-DD" strings instead of Date objects.
// pg's default parser creates new Date(y, m, d) at LOCAL midnight, which
// serialises to a different UTC day when the server timezone ≠ UTC, causing
// the browser to display dates shifted by ±1 day.
types.setTypeParser(1082, val => val);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const db = {
  query: async <T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> => {
    const start = Date.now();
    const res = await pool.query(text, params);
    if (env.NODE_ENV === 'development') {
      const duration = Date.now() - start;
      if (duration > 100) console.log('Slow query:', { text: text.substring(0, 80), duration });
    }
    return res;
  },
  getClient: (): Promise<PoolClient> => pool.connect(),
};

export default pool;
