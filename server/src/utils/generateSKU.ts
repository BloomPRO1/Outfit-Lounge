export function generateSKU(categorySlug: string, productName: string): string {
  const prefix = categorySlug.split('-').map(w => w[0].toUpperCase()).join('').substring(0, 4);
  const namePart = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `TS-${prefix}-${namePart}-${timestamp}`;
}

export function generateVariantSKU(productSku: string, size?: string, color?: string): string {
  const parts = [productSku];
  if (size) parts.push(size.toUpperCase());
  if (color) parts.push(color.toUpperCase().substring(0, 3));
  return parts.join('-');
}

export function generateBookingNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `TS-${year}-${String(sequence).padStart(4, '0')}`;
}

export function generateSaleNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `SALE-${year}${month}-${String(sequence).padStart(4, '0')}`;
}
