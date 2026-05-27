/* global qz — loaded via CDN in index.html */
declare const qz: any;

// RSA public key — QZ Tray verifies app signatures against this.
// The paired private key lives in QZ_PRIVATE_KEY on the server.
const QZ_CERT = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr6eRzK8rLd1fVgv8PHvI
Uv/dEnImgceIMMlB7HrGypx1v5THe8qDup0QHm0lQYE8xbxtU8cQgdt+2gIjojHR
HMRSxu6O51oMACh1uyj/g4goPe/tAm7PONIdhZQeLTrxXOqMmwAmOM7+JmEAYKBG
JqWwmFtgZkpZXHszKTQvwvRkx9f1ysSXhIbPVhXtH1kEQekSLko5F28r+hpvHLSn
JFH26NiEsw5GHoNavDy0+t9VVautQvZcpezmjT7EBRS8K6HyAjlKwOuFfi7tckL/
BvxLhfP+YtYvPh5A43stmh4tYicxglr4TQeXq+Yk24FOj0SoIW94Oak2GzV67+Ag
/wIDAQAB
-----END PUBLIC KEY-----`;

function isAvailable(): boolean {
  return typeof qz !== 'undefined';
}

/** Must be called once before qz.websocket.connect(). */
function setupSecurity(): void {
  qz.security.setCertificatePromise(() => Promise.resolve(QZ_CERT));

  qz.security.setSignaturePromise((toSign: string) =>
    fetch('/api/qz/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: toSign }),
    }).then(r => r.text())
  );
}

/** Try to connect to QZ Tray running on localhost. Returns true on success. */
export async function qzConnect(): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    setupSecurity();   // must run before connect so QZ Tray can verify the cert
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    }
    return true;
  } catch {
    return false;
  }
}

/** Returns true if QZ Tray WebSocket is currently open. */
export function qzIsConnected(): boolean {
  return isAvailable() && qz.websocket.isActive();
}

/** Returns list of all printer names visible to QZ Tray. */
export async function qzGetPrinters(): Promise<string[]> {
  if (!qzIsConnected()) return [];
  try {
    const result = await qz.printers.find();
    return Array.isArray(result) ? result.filter(Boolean) : [result].filter(Boolean);
  } catch {
    return [];
  }
}

/** Sends an HTML receipt string directly to the named printer — no dialog. */
export async function qzPrintHTML(printerName: string, html: string): Promise<void> {
  if (!qzIsConnected()) throw new Error('QZ Tray is not connected');
  const config = qz.configs.create(printerName, {
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    size: { width: 80, units: 'mm' },
    colorType: 'blackwhite',
  });
  await qz.print(config, [{ type: 'html', format: 'plain', data: html }]);
}
