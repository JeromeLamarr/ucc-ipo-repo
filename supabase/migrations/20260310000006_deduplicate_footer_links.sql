-- Remove duplicate footer links caused by migration seed running multiple times.
-- Keeps the earliest-created row for each (group_name, label, url) combination.

DELETE FROM site_footer_links
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY group_name, label, url
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM site_footer_links
  ) ranked
  WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates from re-seeding.
ALTER TABLE site_footer_links
  ADD CONSTRAINT site_footer_links_group_label_url_key
  UNIQUE (group_name, label, url);
