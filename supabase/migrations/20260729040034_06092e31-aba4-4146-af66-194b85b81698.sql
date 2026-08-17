create table public.closed_testing_signups (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    name text,
    platform_preference text check (platform_preference in ('android', 'ios', 'both')),
    source text default 'closed-testing-page',
    ip_hash text,
    user_agent text,
    created_at timestamptz default now(),
    invited_at timestamptz,
    converted_at timestamptz,
    notes text,
    unique (email)
);

grant all on public.closed_testing_signups to service_role;

alter table public.closed_testing_signups enable row level security;
