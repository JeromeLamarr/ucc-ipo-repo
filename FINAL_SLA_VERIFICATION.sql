-- Final verification that SLA infrastructure is ready
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances')
ORDER BY table_schema, table_name;

-- Should return 2 rows:
-- public | workflow_sla_policies
-- public | workflow_stage_instances