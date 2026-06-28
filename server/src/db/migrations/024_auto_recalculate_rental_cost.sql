-- Trigger: automatically recalculate total_rental_cost whenever
-- event_date or rental_end_date changes on a rental row.
-- Billing period = GREATEST(1, rental_end_date - event_date) days.
-- This fires for any UPDATE (API, direct DB edit, admin tool, etc.).

CREATE OR REPLACE FUNCTION fn_recalculate_rental_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_days  INT;
  v_total NUMERIC;
BEGIN
  IF NEW.event_date IS DISTINCT FROM OLD.event_date OR
     NEW.rental_end_date IS DISTINCT FROM OLD.rental_end_date THEN

    v_days := GREATEST(1, (NEW.rental_end_date - NEW.event_date)::INT);

    SELECT COALESCE(SUM(rental_price_per_day * quantity), 0) * v_days
    INTO v_total
    FROM rental_items
    WHERE rental_id = NEW.id;

    NEW.total_rental_cost := v_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_rental_cost ON rentals;

CREATE TRIGGER trg_recalculate_rental_cost
BEFORE UPDATE ON rentals
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_rental_cost();
