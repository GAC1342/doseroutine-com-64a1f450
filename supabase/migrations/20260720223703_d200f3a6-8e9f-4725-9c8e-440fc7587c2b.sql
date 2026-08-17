-- Expand subscriptions table to track Stripe subscription lifecycle
alter table subscriptions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists product_id text,
  add column if not exists price_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists cancel_at_period_end boolean default false,
  add column if not exists environment text default 'sandbox',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Switch primary key from user_id to id so multiple historical rows are possible
alter table subscriptions drop constraint if exists subscriptions_pkey;
alter table subscriptions add primary key (id);

-- Enforce unique Stripe subscription IDs and fast user lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_subscription_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
  END IF;
END $$;

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_id on subscriptions(stripe_subscription_id);

-- Helper: derive tier from the human-readable price id
update subscriptions
set tier = case
  when price_id in ('plus_monthly','plus_yearly') then 'plus'
  when price_id in ('pro_monthly','pro_yearly') then 'pro'
  else coalesce(tier, 'free')
end
where price_id is not null;

-- Service role needs to upsert subscription rows from webhooks
grant all on public.subscriptions to service_role;
