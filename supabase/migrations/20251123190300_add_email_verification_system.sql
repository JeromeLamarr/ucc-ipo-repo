-- Create temp_registrations table to track pending email verifications
CREATE TABLE IF NOT EXISTS temp_registrations (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  CONSTRAINT fk_auth_user FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_temp_registrations_email ON temp_registrations(email);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_auth_user_id ON temp_registrations(auth_user_id);

-- Enable RLS on temp_registrations
ALTER TABLE temp_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own temp registration
CREATE POLICY "temp_reg_select_own" ON temp_registrations
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Policy: Allow service role to manage temp registrations
CREATE POLICY "temp_reg_insert_service" ON temp_registrations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "temp_reg_update_service" ON temp_registrations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "temp_reg_delete_service" ON temp_registrations
  FOR DELETE
  TO service_role
  USING (true);
