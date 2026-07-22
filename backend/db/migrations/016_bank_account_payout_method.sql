-- Add bank account fields to vendor_payout_methods for bank transfer support
-- Fields are encrypted at the application layer before storage

ALTER TABLE vendor_payout_methods 
ADD COLUMN bank_account_number VARCHAR(100) NULL,
ADD COLUMN bank_routing_number VARCHAR(50) NULL,
ADD COLUMN bank_currency VARCHAR(3) NULL DEFAULT 'KES';

-- Add index for faster lookups by bank account number
ALTER TABLE vendor_payout_methods 
ADD INDEX idx_bank_account_number (bank_account_number);

-- Update existing bank_transfer methods to have default currency
UPDATE vendor_payout_methods 
SET bank_currency = 'KES' 
WHERE type = 'bank_transfer' AND bank_currency IS NULL;