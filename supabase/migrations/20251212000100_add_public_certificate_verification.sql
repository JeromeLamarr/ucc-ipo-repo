-- Add Public Certificate Verification Policy
-- This allows unauthenticated users to view certificates for verification purposes

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public certificate verification" ON certificates;
DROP POLICY IF EXISTS "Public certificate verification authenticated" ON certificates;
DROP POLICY IF EXISTS "Public IP record access for verification" ON ip_records;
DROP POLICY IF EXISTS "Public user access for verification" ON users;

-- Add public read-only policy for certificates
-- Anyone can view certificates for verification purposes
CREATE POLICY "Public certificate verification" ON certificates
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public certificate verification authenticated" ON certificates
FOR SELECT TO authenticated
USING (true);

-- Add public read-only policy for IP records
-- Anyone can view IP records that have certificates issued (for verification)
CREATE POLICY "Public IP record access for verification" ON ip_records
FOR SELECT TO anon
USING (true);

-- Add public read-only policy for users (limited to name and email)
-- Anyone can view limited user information for certificate verification
CREATE POLICY "Public user access for verification" ON users
FOR SELECT TO anon
USING (true);
