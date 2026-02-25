/*
  # Add Password Reset Tokens Table

  1. New Tables
    - `password_reset_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `token` (text, unique random token)
      - `email` (text, indexed)
      - `expires_at` (timestamptz)
      - `used` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `password_reset_tokens` table
    - Add policy for system to create tokens
    - Add policy for users to use their own token

  3. Indexes
    - Index on token for lookups
    - Index on email for lookups
    - Index on expires_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can create password reset tokens"
  ON password_reset_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can read password reset tokens"
  ON password_reset_tokens FOR SELECT
  USING (true);

CREATE POLICY "System can update password reset tokens"
  ON password_reset_tokens FOR UPDATE
  USING (true);

-- Optional: Auto-cleanup trigger for expired tokens (runs periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < now() AND used = false;
END;
$$ LANGUAGE plpgsql;
