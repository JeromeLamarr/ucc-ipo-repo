-- CRITICAL: Run this SQL in your Supabase dashboard to enable public certificate verification

-- Enable public access to certificates table for verification
DROP POLICY IF EXISTS "Public certificate verification" ON certificates;
CREATE POLICY "Public certificate verification" ON certificates
FOR SELECT TO anon
USING (true);

-- Ensure authenticated users can also access
DROP POLICY IF EXISTS "Public certificate verification authenticated" ON certificates;
CREATE POLICY "Public certificate verification authenticated" ON certificates
FOR SELECT TO authenticated
USING (true);

-- Enable public access to IP records
DROP POLICY IF EXISTS "Public IP record access for verification" ON ip_records;
CREATE POLICY "Public IP record access for verification" ON ip_records
FOR SELECT TO anon
USING (true);

-- Enable public access to users (for creator info)
DROP POLICY IF EXISTS "Public user access for verification" ON users;
CREATE POLICY "Public user access for verification" ON users
FOR SELECT TO anon
USING (true);
