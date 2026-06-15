import { Router, Request, Response } from 'express';
import { getStoredInvoice, generatePOSInvoicePDF } from '../services/pdfInvoiceService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public — no auth required so wa.me links work without login
router.get('/download/:token', (req: Request, res: Response) => {
  const entry = getStoredInvoice(req.params.token);
  if (!entry) {
    res.status(404).send('<h2>Invoice not found or expired</h2><p>Links are valid for 24 hours.</p>');
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${entry.filename}"`);
  res.setHeader('Content-Length', entry.buffer.length);
  res.send(entry.buffer);
});

// Authenticated — generate/fetch PDF for a specific sale on demand
router.get('/sale/:saleId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await generatePOSInvoicePDF(req.params.saleId);
    const entry = getStoredInvoice(token);
    if (!entry) { res.status(404).json({ error: 'Failed to generate invoice' }); return; }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${entry.filename}"`);
    res.setHeader('Content-Length', entry.buffer.length);
    res.send(entry.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate invoice' });
  }
});

export default router;
