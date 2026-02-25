-- Step 2: Check if SLA migrations are applied in production
SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260225%' OR name ILIKE '%sla%' 
ORDER BY executed_at DESC;