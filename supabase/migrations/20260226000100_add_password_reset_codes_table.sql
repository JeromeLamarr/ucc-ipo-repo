/*
  # Add Password Reset Codes System

  1. New Tables
    - `password_reset_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null, indexed)
      - `auth_user_id` (uuid, not null)
      - `code_hash` (text, not null - SHA256 hash of 6-digit code)
      - `expires_at` (timestamptz, not null)
      - `used_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `password_reset_codes` table
    - Deny public reads (service role only via edge functions)
    - Only service role can insert/update

  3. Indexes
    - Index on (email) for faster lookups
    - Index on (expires_at) for cleanup queries
*/

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  auth_user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Enable RLS (service role bypasses it, public users can't access)
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service role and admin bypass RLS)
CREATE POLICY "deny_public_access"
  ON password_reset_codes FOR ALL
  USING (false);
