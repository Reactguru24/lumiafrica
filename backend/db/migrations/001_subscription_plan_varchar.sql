-- Run once: allows storing Paystack plan_code (e.g. PLN_xxx) on vendor subscriptions.
ALTER TABLE vendor_subscriptions MODIFY COLUMN plan VARCHAR(64) NOT NULL;
