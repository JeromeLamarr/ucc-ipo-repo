-- Add tracking_id column to full_disclosures if it doesn't exist
ALTER TABLE public.full_disclosures
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;

-- Update full_disclosures table to set tracking_id from ip_records where tracking_id is null
UPDATE public.full_disclosures fd
SET tracking_id = (
  SELECT ir.tracking_id 
  FROM public.ip_records ir 
  WHERE ir.id = fd.ip_record_id
)
WHERE fd.tracking_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.ip_records ir 
    WHERE ir.id = fd.ip_record_id 
    AND ir.tracking_id IS NOT NULL
  );

-- For any remaining records without tracking_id, generate one from the IP record ID
UPDATE public.full_disclosures fd
SET tracking_id = (
  'UCC-' || DATE_PART('year', ir.created_at)::text || '-' || 
  UPPER(SUBSTRING(ir.id, 1, 5))
)
FROM public.ip_records ir
WHERE fd.ip_record_id = ir.id
AND fd.tracking_id IS NULL;
