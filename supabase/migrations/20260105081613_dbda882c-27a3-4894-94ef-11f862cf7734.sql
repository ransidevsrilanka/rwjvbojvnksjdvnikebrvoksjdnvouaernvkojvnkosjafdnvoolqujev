-- Add custom commission_rate column to creator_profiles
ALTER TABLE creator_profiles 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,2) DEFAULT NULL;

COMMENT ON COLUMN creator_profiles.commission_rate IS 
'Custom commission rate (0.00-1.00). NULL = use automatic rate based on lifetime_paid_users';

-- Create index for faster head_ops_requests queries
CREATE INDEX IF NOT EXISTS idx_head_ops_requests_status ON head_ops_requests(status);