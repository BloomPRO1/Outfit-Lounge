/* global qz — loaded via CDN in index.html */
declare const qz: any;

function isAvailable(): boolean {
  return typeof qz !== 'undefined';
}

/** Try to connect to QZ Tray running on localhost. Returns true on success. */
export async function qzConnect(): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({
        retries: 1,
        delay: 1,
      });
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
