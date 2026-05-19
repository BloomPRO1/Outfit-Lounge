import { Pool, PoolClient } from 'pg';
import { env } from './env';

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
