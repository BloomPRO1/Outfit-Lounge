import { Request, Response } from 'express';
import { db } from '../config/database';
import { sendNotification } from '../services/notificationService';
import { AuthRequest } from '../middleware/auth';

// ─── FitSMS Delivery Report Webhook ─────────────────────────────────────────
export async function fitsmsWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;
    console.log('[FitSMS Webhook] Delivery report received:', JSON.stringify(body));

    // FitSMS sends: { ruid, recipient, status, error_code, ... }
    const { ruid, recipient, status } = body;

    if (recipient && status) {
      const deliveryStatus = status === 'delivered' ? 'sent' : status === 'failed' ? 'failed' : null;
      if (deliveryStatus) {
        await db.query(
          `UPDATE notification_logs
           SET status = $1
           WHERE recipient = $2
             AND status = 'sent'
             AND created_at > NOW() - INTERVAL '24 hours'`,
          [deliveryStatus, recipient]
        );
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[FitSMS Webhook] Error:', err.message);
    res.status(200).json({ received: true }); // Always 200 to stop FitSMS retries
  }
}

export async function getNotificationLogs(req: Request, res: Response): Promise<void> {
  try {
    const { rentalId, customerId, status, channel, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let pi = 1;

    if (rentalId) { whereClause += ` AND nl.rental_id = $${pi++}`; params.push(rentalId); }
    if (customerId) { whereClause += ` AND nl.customer_id = $${pi++}`; params.push(customerId); }
    if (status) { whereClause += ` AND nl.status = $${pi++}`; params.push(status); }
    if (channel) { whereClause += ` AND nl.channel = $${pi++}`; params.push(channel); }
    if (search) {
      whereClause += ` AND (c.name ILIKE $${pi} OR r.booking_number ILIKE $${pi} OR nl.recipient ILIKE $${pi})`;
      params.push(`%${search}%`);
      pi++;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM notification_logs nl
       LEFT JOIN customers c ON c.id = nl.customer_id
       LEFT JOIN rentals r ON r.id = nl.rental_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    const result = await db.query(`
      SELECT nl.*, c.name as customer_name, r.booking_number
      FROM notification_logs nl
      LEFT JOIN customers c ON c.id = nl.customer_id
      LEFT JOIN rentals r ON r.id = nl.rental_id
      ${whereClause}
      ORDER BY nl.created_at DESC
      LIMIT $${pi} OFFSET $${pi + 1}
    `, [...params, limitNum, offset]);

    const statsRes = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
        COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed
      FROM notification_logs
    `);
    const s = statsRes.rows[0];

    res.json({
      data: result.rows,
      stats: {
        totalSent: parseInt(s.total_sent),
        totalPending: parseInt(s.total_pending),
        totalFailed: parseInt(s.total_failed),
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('getNotificationLogs error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function sendManualNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { customerId, rentalId, channel, type, message } = req.body;

    if (!customerId || !channel || !message) {
      res.status(400).json({ error: 'customerId, channel, and message are required' });
      return;
    }

    const customerRes = await db.query(
      `SELECT phone, whatsapp, email FROM customers WHERE id = $1`,
      [customerId]
    );

    if (!customerRes.rows[0]) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const customer = customerRes.rows[0];
    const recipient = channel === 'whatsapp' ? customer.whatsapp :
                      channel === 'sms' ? customer.phone :
                      customer.email;

    if (!recipient) {
      res.status(400).json({ error: `Customer has no ${channel} contact` });
      return;
    }

    await sendNotification({
      rentalId,
      customerId,
      type: type || 'manual',
      channel,
      recipient,
      message,
    });

    res.json({ message: 'Notification sent successfully' });
  } catch (err: any) {
    console.error('sendManualNotification error:', err);
    res.status(500).json({ error: err.message });
  }
}
