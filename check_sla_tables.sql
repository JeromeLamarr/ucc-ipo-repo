-- Step 3: Check if SLA tables exist in production
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances') 
ORDER BY table_schema, table_name;