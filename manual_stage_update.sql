-- Temporary fix to set academic materials stage
-- This updates the record that's showing in the UI to have the correct stage

-- First, ensure the presentation_materials table has a record for this IP
INSERT INTO presentation_materials (ip_record_id, status)
SELECT id, 'not_requested'
FROM ip_records
WHERE status = 'evaluator_approved'
AND id NOT IN (SELECT ip_record_id FROM presentation_materials)
LIMIT 1
ON CONFLICT DO NOTHING;

-- Update the stage to academic_presentation_materials
UPDATE ip_records 
SET current_stage = 'academic_presentation_materials'
WHERE status = 'evaluator_approved' 
AND current_stage != 'academic_presentation_materials'
LIMIT 1;

-- Verify the updates
SELECT 'IP Records Updated:' as info;
SELECT id, title, status, current_stage FROM ip_records WHERE current_stage = 'academic_presentation_materials' LIMIT 5;

SELECT 'Presentation Materials Records:' as info;
SELECT id, ip_record_id, status FROM presentation_materials LIMIT 5;
