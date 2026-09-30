ALTER TABLE note
    ADD COLUMN IF NOT EXISTS price_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE note
    DROP CONSTRAINT IF EXISTS note_price_discount_percent_range;

ALTER TABLE note
    ADD CONSTRAINT note_price_discount_percent_range
    CHECK (price_discount_percent >= 0 AND price_discount_percent <= 100);
