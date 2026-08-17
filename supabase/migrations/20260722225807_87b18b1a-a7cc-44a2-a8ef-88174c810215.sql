
-- Add native IAP support to subscriptions table.
-- store_transaction_id is the platform receipt/transaction identifier
-- (Apple's original_transaction_id or Google's purchaseToken).
-- store_product_id is the platform SKU (e.g. stackwise_plus_weekly_trial).
-- entitlement is the RevenueCat entitlement identifier (plus | pro).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS store_transaction_id text,
  ADD COLUMN IF NOT EXISTS store_product_id text,
  ADD COLUMN IF NOT EXISTS entitlement text,
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

-- Backfill provider on existing rows (they came from Stripe).
UPDATE public.subscriptions SET provider = 'stripe' WHERE provider IS NULL;

-- Make stripe_subscription_id nullable so IAP rows can omit it.
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Unique index on store_transaction_id (only when set) for idempotent IAP upserts.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_store_transaction_id_key
  ON public.subscriptions(store_transaction_id)
  WHERE store_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_provider_user_idx
  ON public.subscriptions(user_id, provider);
