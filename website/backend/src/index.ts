import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { pool } from './db/pool';
import productsRouter from './routes/products';
import authRouter from './routes/auth';
import ordersRouter from './routes/orders';
import promotionsRouter from './routes/promotions';
import adminAuthRouter from './routes/adminAuth';
import adminPromotionsRouter from './routes/adminPromotions';
import adminDashboardRouter from './routes/adminDashboard';
import contactRouter from './routes/contact';
import adminContactRouter from './routes/adminContact';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3001' }));
// Higher limit than the 100kb default — banner images are sent as base64 JSON.
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api', productsRouter);
app.use('/api', authRouter);
app.use('/api', ordersRouter);
app.use('/api', promotionsRouter);
app.use('/api', adminAuthRouter);
app.use('/api', adminPromotionsRouter);
app.use('/api', adminDashboardRouter);
app.use('/api', contactRouter);
app.use('/api', adminContactRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Website backend listening on port ${PORT}`);
});
