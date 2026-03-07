-- Add is_flagged column to users table for anti-gaming detection
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
