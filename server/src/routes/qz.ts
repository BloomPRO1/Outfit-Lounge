import { Router, Request, Response } from 'express';
import { createSign } from 'crypto';

const router = Router();

// Public — called by the browser to sign QZ Tray challenges with the app private key.
// QZ Tray verifies the signature against the public cert; once trusted, no popup ever.
router.post('/sign', (req: Request, res: Response): void => {
  const { request } = req.body as { request?: string };
  const privateKey = (process.env.QZ_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!request) {
    res.status(400).send('Missing request');
    return;
  }
  if (!privateKey) {
    // No key configured — return empty string so QZ Tray falls back to unsigned
    res.send('');
    return;
  }

  try {
    const sign = createSign('SHA512');
    sign.update(request);
    res.send(sign.sign(privateKey, 'base64'));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

export default router;
