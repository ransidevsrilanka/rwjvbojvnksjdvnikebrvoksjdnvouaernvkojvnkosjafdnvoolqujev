-- Add failure_reason and refund-related columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refunded_by UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;