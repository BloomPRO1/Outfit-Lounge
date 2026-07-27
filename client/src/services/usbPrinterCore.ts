/**
 * Shared WebUSB plumbing for the receipt (ESC/POS) and label (TSPL) printers.
 *
 * Both services used to keep their own copy of this logic, which is how the
 * hangs crept in: the label path had no transfer timeout at all, and the
 * receipt path awaited `dev.close()` inside its own error handler — but
 * close() waits for pending transfers to drain, which on a wedged printer
 * never happens. Either one leaves the caller's promise unsettled, the Print
 * button stuck in its loading state, and a page refresh as the only way out.
 *
 * Everything here is written so a dead printer can never block the caller:
 * transfers race a timeout, teardown is never awaited unbounded, and the slot
 * is dropped immediately so the next attempt falls back to the print dialog.
 */

export type PrinterRole = 'receipt' | 'label';

/**
 * An error whose message is written for shop staff and is safe to show as-is.
 *
 * Everything else that escapes this module is a raw browser DOMException
 * ("Unable to claim interface.", "Access denied.") — accurate but meaningless
 * at the till, so the UI keeps its own wording for those.
 */
export class PrinterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrinterError';
  }
}

interface Slot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  device: any;
  outEp: number;
  iface: number | null; // claimed interface, so unbind can release it
}

const TRANSFER_TIMEOUT_MS = 5_000;
const CLOSE_TIMEOUT_MS    = 1_500;

const ROLE_LABEL: Record<PrinterRole, string> = {
  receipt: 'receipt printer',
  label:   'label printer',
};

const slots: Record<PrinterRole, Slot | null> = { receipt: null, label: null };

/** Serialises transfers per role so two fast clicks can't interleave byte streams. */
const queue: Record<PrinterRole, Promise<unknown>> = {
  receipt: Promise.resolve(),
  label:   Promise.resolve(),
};

const other = (role: PrinterRole): PrinterRole => (role === 'receipt' ? 'label' : 'receipt');

// ─── Promise helpers ─────────────────────────────────────────────────────────

/**
 * Rejects if `p` hasn't settled within `ms`. Attaches a no-op catch to `p` so a
 * late rejection can't surface as an unhandled promise rejection.
 */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  p.catch(() => { /* handled by the race below */ });
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PrinterError(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer!));
}

/** Waits for `p`, gives up after `ms`, and never rejects. */
function settleQuietly(p: Promise<unknown>, ms: number): Promise<void> {
  return withTimeout(p, ms, 'timed out').then(() => { /* ok */ }, () => { /* ignored */ });
}

/**
 * Closes a device without ever blocking indefinitely. Callers that are in an
 * error path should not await this at all — see `transfer`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function closeQuietly(d: any): Promise<void> {
  if (!d) return Promise.resolve();
  return settleQuietly(
    Promise.resolve().then(() => d.close()),
    CLOSE_TIMEOUT_MS,
  );
}

// ─── Device identity ─────────────────────────────────────────────────────────

/**
 * True when both handles point at the same physical printer. Chrome normally
 * hands back the same USBDevice instance for a device this origin has already
 * been granted, so identity covers the common case; the descriptor comparison
 * is the backstop.
 *
 * Serial numbers are required for that backstop on purpose — two identical
 * printer models are indistinguishable without one, and a false match here
 * would wrongly block a legitimate second printer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSameDevice(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (!a.serialNumber || !b.serialNumber) return false;
  return a.vendorId === b.vendorId
    && a.productId === b.productId
    && a.serialNumber === b.serialNumber;
}

/** True when the two slots are bound to the same physical printer. */
export function hasDeviceConflict(): boolean {
  const r = slots.receipt;
  const l = slots.label;
  return !!r && !!l && isSameDevice(r.device, l.device);
}

// ─── Binding ─────────────────────────────────────────────────────────────────

/**
 * Opens the device and claims an interface that exposes a bulk-OUT endpoint.
 *
 * The old code swallowed every claim failure and then bound the device anyway
 * with a guessed `outEp = 1`. Writing into a pipe that was never claimed is
 * precisely the case that hangs instead of erroring, so a total failure now
 * throws with something the cashier can act on.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function openAndBind(role: PrinterRole, d: any): Promise<void> {
  // Re-pairing the same printer can reach here while the previous handle's
  // close() is still draining; opening an already-open device throws.
  if (!d.opened) await d.open();
  if (d.configuration === null) await d.selectConfiguration(1);

  let fallbackIface: number | null = null;

  for (const iface of d.configuration?.interfaces ?? []) {
    try {
      await d.claimInterface(iface.interfaceNumber);
    } catch {
      continue; // held by an OS driver — try the next one
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ep = (iface.alternates?.[0]?.endpoints ?? []).find(
      (e: any) => e.direction === 'out' && e.type === 'bulk',
    );

    if (ep) {
      slots[role] = { device: d, outEp: ep.endpointNumber, iface: iface.interfaceNumber };
      return;
    }

    // Claimed, but it advertises no bulk-OUT. Keep the first such interface as
    // a last resort — some cheap thermal printers under-report descriptors and
    // still accept data on endpoint 1 — and carry on looking for a real one.
    if (fallbackIface === null) {
      fallbackIface = iface.interfaceNumber;
    } else {
      try { await d.releaseInterface(iface.interfaceNumber); } catch { /* ignore */ }
    }
  }

  if (fallbackIface !== null) {
    slots[role] = { device: d, outEp: 1, iface: fallbackIface };
    return;
  }

  void closeQuietly(d);
  throw new PrinterError(
    'Could not claim this printer — Windows still has a driver attached to it. ' +
    'Uninstall the driver in Device Manager, or use the print-dialog option instead.',
  );
}

/** Ask the user to pick a USB printer for this role. Chrome remembers the pairing. */
export async function requestAndBind(role: PrinterRole): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usb = (navigator as any).usb;
  if (!usb) throw new PrinterError('This browser has no WebUSB support — use Chrome or Edge.');

  // Pick first, release afterwards: cancelling the picker must not disconnect
  // the printer that is already working.
  const d = await usb.requestDevice({ filters: [] });

  // Guard the same-device clash. With both slots on one printer, TSPL label
  // commands get sent to the receipt printer (and ESC/POS to the labels), and
  // the duplicate interface claim wedges the pipe.
  const rival = slots[other(role)];
  if (rival && isSameDevice(rival.device, d)) {
    throw new PrinterError(
      `That device is already assigned as the ${ROLE_LABEL[other(role)]}. ` +
      `Pick the other printer, or disconnect the ${ROLE_LABEL[other(role)]} first.`,
    );
  }

  await unbind(role);
  await openAndBind(role, d);

  return d.productName || (role === 'label' ? 'USB Label Printer' : 'USB Printer');
}

/** Release this role's printer. Bounded — a wedged device cannot stall it. */
export async function unbind(role: PrinterRole): Promise<void> {
  const slot = slots[role];
  if (!slot) return;
  slots[role] = null;

  if (slot.iface !== null) {
    await settleQuietly(
      Promise.resolve().then(() => slot.device.releaseInterface(slot.iface)),
      CLOSE_TIMEOUT_MS,
    );
  }
  await closeQuietly(slot.device);
}

export function isBound(role: PrinterRole): boolean {
  return slots[role] !== null;
}

export function boundName(role: PrinterRole): string {
  return slots[role]?.device?.productName || '';
}

export function boundDevice(role: PrinterRole): unknown {
  return slots[role]?.device ?? null;
}

// ─── Transfer ────────────────────────────────────────────────────────────────

async function doTransfer(role: PrinterRole, data: Uint8Array): Promise<void> {
  const slot = slots[role];
  if (!slot) throw new PrinterError(`No ${ROLE_LABEL[role]} connected`);

  // A power-cycled printer, or one the OS put into USB selective suspend,
  // leaves a handle that still looks connected. `opened` catches that before
  // we write into a dead pipe.
  if (slot.device.opened === false) {
    slots[role] = null;
    throw new PrinterError(`The ${ROLE_LABEL[role]} connection was lost — reconnect it in Settings.`);
  }

  try {
    const result = await withTimeout(
      Promise.resolve().then(() => slot.device.transferOut(slot.outEp, data)),
      TRANSFER_TIMEOUT_MS,
      `The ${ROLE_LABEL[role]} did not respond — check that it is powered on and has paper.`,
    );
    // A stalled endpoint resolves rather than rejecting, but nothing printed.
    if (result && result.status && result.status !== 'ok') {
      throw new PrinterError(`The ${ROLE_LABEL[role]} rejected the job (${result.status}).`);
    }
  } catch (err) {
    // Drop the slot straight away so the next attempt takes the print-dialog
    // fallback instead of hanging on the same dead pipe. The close is
    // deliberately NOT awaited — it blocks until the failed transfer drains.
    slots[role] = null;
    void closeQuietly(slot.device);
    throw err;
  }
}

/**
 * Sends raw bytes to the printer bound to `role`.
 *
 * Always settles: either it resolves, or it rejects within TRANSFER_TIMEOUT_MS
 * so the caller can clear its loading flag and fall back.
 */
export function transfer(role: PrinterRole, data: Uint8Array): Promise<void> {
  const run = queue[role].catch(() => { /* previous job's failure is its own */ })
    .then(() => doTransfer(role, data));
  queue[role] = run.catch(() => { /* keep the chain alive */ });
  return run;
}

// ─── Physical unplug ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
if (nav?.usb) {
  nav.usb.addEventListener('disconnect', (e: any) => {
    for (const role of ['receipt', 'label'] as PrinterRole[]) {
      const slot = slots[role];
      if (slot && isSameDevice(slot.device, e.device)) slots[role] = null;
    }
  });
}
