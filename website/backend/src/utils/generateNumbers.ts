export function generateSaleNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `SALE-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

export function generateBookingNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `TS-${year}-${String(sequence).padStart(4, '0')}`;
}
