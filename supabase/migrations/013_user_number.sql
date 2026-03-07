-- Add auto-incrementing user_number column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS user_number SERIAL;

-- Backfill existing users in signup order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at ASC, id ASC) AS rn
  FROM public.users
)
UPDATE public.users
SET user_number = numbered.rn
FROM numbered
WHERE public.users.id = numbered.id;
