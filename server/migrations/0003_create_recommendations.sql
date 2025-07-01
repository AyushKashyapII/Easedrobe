-- Migration: Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_ids INTEGER[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  feedback TEXT
); 