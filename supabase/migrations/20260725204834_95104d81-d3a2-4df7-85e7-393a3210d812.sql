-- 1) subscriptions: SELECT-only for authenticated
drop policy if exists own_subscriptions on public.subscriptions;

create policy "subscriptions_owner_read"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.subscriptions from authenticated;
revoke insert, update, delete on public.subscriptions from anon;

-- 2) profiles: protect billing/entitlement columns from client writes
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.has_used_trial := old.has_used_trial;
  new.grandfathered := old.grandfathered;
  return new;
end
$$;

drop trigger if exists profiles_protect_billing_cols on public.profiles;
create trigger profiles_protect_billing_cols
  before update on public.profiles
  for each row
  execute function public.protect_profile_billing_columns();

-- 3) chat_usage: allow the owner to insert/update their own counter
grant insert, update on public.chat_usage to authenticated;

drop policy if exists "chat_usage_owner_write" on public.chat_usage;
create policy "chat_usage_owner_write"
  on public.chat_usage
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "chat_usage_owner_update" on public.chat_usage;
create policy "chat_usage_owner_update"
  on public.chat_usage
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());