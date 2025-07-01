-- Migration: Add recommendations_generated_at to users table
ALTER TABLE users ADD COLUMN recommendations_generated_at TIMESTAMP; 