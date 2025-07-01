ALTER TABLE clothing_items
ADD COLUMN IF NOT EXISTS style text DEFAULT 'casual',
ADD COLUMN IF NOT EXISTS color text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS material text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS occasions text[],
ADD COLUMN IF NOT EXISTS seasonal_rating jsonb DEFAULT '{"spring": 5, "summer": 5, "fall": 5, "winter": 5}'::jsonb; 