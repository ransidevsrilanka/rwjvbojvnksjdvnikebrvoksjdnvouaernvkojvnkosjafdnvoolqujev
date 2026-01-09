-- Fix existing enrollments with null medium
UPDATE enrollments 
SET medium = 'english' 
WHERE medium IS NULL;

-- Fix existing access_codes with null medium
UPDATE access_codes 
SET medium = 'english' 
WHERE medium IS NULL;

-- Set default for medium column on enrollments
ALTER TABLE enrollments 
ALTER COLUMN medium SET DEFAULT 'english';

-- Set default for medium column on access_codes
ALTER TABLE access_codes 
ALTER COLUMN medium SET DEFAULT 'english';