import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { calculateFine } from '../services/fineService';

export async function getPendingReturns(_req: Request, res: Response): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db.query(`
    SELECT r.*,
           c.name as customer_name, c.phone as customer_phone,
           COUNT(ri.id) as item_count,
           COUNT(ri.id) FILTER (WHERE ri.is_returned = false) as pending_items,
           GREATEST(0, CURRENT_DATE - r.rental_end_date) as days_overdue
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    JOIN rental_items ri ON ri.rental_id = r.id
    WHERE r.status IN ('picked_up', 'late_return')
    GROUP BY r.id, c.name, c.phone
    HAVING COUNT(ri.id) FILTER (WHERE ri.is_returned = false) > 0
    ORDER BY r.rental_end_date ASC
  `);

  res.json(result.rows);
}

export async function processReturn(req: AuthRequest, res: Response): Promise<void> {
  const { rentalId } = req.params;
  const { items, returnDate, paymentMethod = 'cash', collectFine = true } = req.body;

  const rentalRes = await db.query(`
    SELECT r.*, c.name as customer_name, c.whatsapp, c.phone, c.id as customer_id
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    WHERE r.id = $1
  `, [rentalId]);

  if (!rentalRes.rows[0]) {
    res.status(404).json({ error: 'Rental not found' });
    return;
  }

  const rental = rentalRes.rows[0];
  const actualReturn = returnDate ? new Date(returnDate) : new Date();

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let totalFine = 0;
    let damageNotes: string[] = [];

    // Process each returned item
    for (const item of items) {
      const { rentalItemId, condition, quantity } = item;

      await client.query(`
        UPDATE rental_items
        SET is_returned = true, return_condition = $1, returned_at = $2
        WHERE id = $3 AND rental_id = $4
      `, [condition || 'good', actualReturn.toISOString(), rentalItemId, rentalId]);

      // Get variant info
      const riRes = await client.query(`
        SELECT ri.product_variant_id, ri.rental_price_per_day, ri.quantity
        FROM rental_items ri
        WHERE ri.id = $1
      `, [rentalItemId]);

      if (riRes.rows[0]) {
        const { product_variant_id, quantity: itemQty } = riRes.rows[0];

        // Calculate fine for this item
        const fineCalc = await calculateFine(
          new Date(rental.rental_end_date),
          actualReturn,
          parseFloat(rental.total_fine) > 0 ? 20 : 20 // use default fine per day
        );
        totalFine += fineCalc.totalFine;

        // Return to inventory
        await client.query(`
          UPDATE product_variants
          SET available_for_rent = available_for_rent + $1,
              damaged_count = CASE WHEN $2 = 'damaged' THEN damaged_count + 1 ELSE damaged_count END,
              updated_at = NOW()
          WHERE id = $3
        `, [itemQty || 1, condition, product_variant_id]);

        await client.query(`
          INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, reference_id, reference_type, created_by)
          VALUES ($1, 'rental_return', $2, $3, $4, 'rental', $5)
        `, [
          product_variant_id,
          itemQty || 1,
          condition === 'damaged' ? 'Returned damaged' : 'Rental return',
          rentalId,
          req.user?.id,
        ]);

        if (condition === 'damaged') {
          damageNotes.push(`Item damaged`);
        }
      }
    }

    // Check if all items are returned
    const pendingRes = await client.query(
      `SELECT COUNT(*) FROM rental_items WHERE rental_id = $1 AND is_returned = false`,
      [rentalId]
    );
    const allReturned = parseInt(pendingRes.rows[0].count) === 0;

    // Calculate total fine
    const fineCalc = await calculateFine(
      new Date(rental.rental_end_date),
      actualReturn,
      20
    );

    if (fineCalc.totalFine > 0 && collectFine) {
      // Check if fine record already exists
      const existingFine = await client.query(
        `SELECT id FROM fine_transactions WHERE rental_id = $1 AND is_paid = false`,
        [rentalId]
      );

      if (existingFine.rows.length === 0) {
        await client.query(`
          INSERT INTO fine_transactions (rental_id, days_late, fine_per_day, total_fine)
          VALUES ($1, $2, $3, $4)
        `, [rentalId, fineCalc.daysLate, fineCalc.finePerDay, fineCalc.totalFine]);
      }
    }

    // Update rental status
    const newStatus = allReturned ? (fineCalc.totalFine > 0 ? 'returned' : 'completed') : rental.status;

    await client.query(`
      UPDATE rentals SET
        status = $1,
        actual_return_date = $2,
        total_fine = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [newStatus, actualReturn.toISOString().split('T')[0], fineCalc.totalFine, rentalId]);

    // Record fine payment if paid now
    if (fineCalc.totalFine > 0 && collectFine) {
      await client.query(`
        INSERT INTO payments (rental_id, amount, payment_method, payment_type, notes, created_by)
        VALUES ($1, $2, $3, 'fine', $4, $5)
      `, [rentalId, fineCalc.totalFine, paymentMethod, `Late return fine: ${fineCalc.daysLate} days`, req.user?.id]);

      await client.query(`
        UPDATE fine_transactions SET is_paid = true, paid_at = NOW(), paid_by = $1
        WHERE rental_id = $2 AND is_paid = false
      `, [req.user?.id, rentalId]);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Return processed successfully',
      allReturned,
      fine: fineCalc,
      damages: damageNotes,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function getFineCalculation(req: Request, res: Response): Promise<void> {
  const { rentalId } = req.params;
  const { returnDate } = req.query;

  const rentalRes = await db.query(
    `SELECT rental_end_date FROM rentals WHERE id = $1`,
    [rentalId]
  );

  if (!rentalRes.rows[0]) {
    res.status(404).json({ error: 'Rental not found' });
    return;
  }

  const actualReturn = returnDate ? new Date(returnDate as string) : new Date();
  const fine = await calculateFine(
    new Date(rentalRes.rows[0].rental_end_date),
    actualReturn,
    20
  );

  res.json(fine);
}
