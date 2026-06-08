-- Add event_date to rentals: the day of the event, used for rental cost calculation.
-- Cost is calculated from event_date to rental_end_date (return date).
-- rental_start_date remains the pickup date and is not used for billing.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS event_date DATE;

-- Default existing rentals: treat rental_start_date as the event date so
-- existing cost calculations remain unchanged.
UPDATE rentals SET event_date = rental_start_date WHERE event_date IS NULL;
