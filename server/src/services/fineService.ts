import { db } from '../config/database';

export interface FineCalculation {
  daysLate: number;
  finePerDay: number;
  totalFine: number;
  gracePeriod: number;
}

export async function calculateFine(
  rentalEndDate: Date,
  returnDate: Date,
  finePerDay: number
): Promise<FineCalculation> {
  // Get grace period from settings
  const settingRes = await db.query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'rental_grace_period'`
  );
  const gracePeriod = parseInt(settingRes.rows[0]?.value || '0');

  const end = new Date(rentalEndDate);
  end.setHours(0, 0, 0, 0);
  const ret = new Date(returnDate);
  ret.setHours(0, 0, 0, 0);

  const diffMs = ret.getTime() - end.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysLate = Math.max(0, diffDays - gracePeriod);
  const totalFine = daysLate * finePerDay;

  return { daysLate, finePerDay, totalFine, gracePeriod };
}

export async function processReturnFine(rentalId: string, returnDate: Date): Promise<FineCalculation | null> {
  const rentalRes = await db.query(
    `SELECT r.rental_end_date,
            SUM(ri.rental_price_per_day * ri.quantity) as daily_rate
     FROM rentals r
     JOIN rental_items ri ON ri.rental_id = r.id
     WHERE r.id = $1
     GROUP BY r.rental_end_date`,
    [rentalId]
  );

  if (!rentalRes.rows[0]) return null;

  const { rental_end_date } = rentalRes.rows[0];

  // Get the effective fine per day from settings as fallback
  const settingRes = await db.query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'default_fine_per_day'`
  );
  const defaultFinePerDay = parseFloat(settingRes.rows[0]?.value || '20');

  const fine = await calculateFine(new Date(rental_end_date), returnDate, defaultFinePerDay);

  if (fine.totalFine > 0) {
    await db.query(
      `INSERT INTO fine_transactions (rental_id, days_late, fine_per_day, total_fine)
       VALUES ($1, $2, $3, $4)`,
      [rentalId, fine.daysLate, fine.finePerDay, fine.totalFine]
    );

    await db.query(
      `UPDATE rentals SET total_fine = $1 WHERE id = $2`,
      [fine.totalFine, rentalId]
    );
  }

  return fine;
}
