-- Add razorpay_signature column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;