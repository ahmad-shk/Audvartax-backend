create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  password_hash text,
  first_name text not null,
  last_name text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  auth_provider text not null default 'password' check (auth_provider in ('password', 'google')),
  google_subject text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

create table if not exists public.applications (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  service_slug text not null,
  status text not null check (
    status in ('draft', 'submitted', 'ready_for_payment', 'paid', 'processing', 'completed', 'cancelled')
  ),
  data jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_service_slug_idx on public.applications(service_slug);

create table if not exists public.billing_orders (
  id uuid primary key,
  application_id text not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  currency text not null check (currency in ('USD', 'GBP', 'PKR')),
  status text not null check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, user_id)
);

create index if not exists billing_orders_user_id_idx on public.billing_orders(user_id);
create index if not exists billing_orders_application_id_idx on public.billing_orders(application_id);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.applications enable row level security;
alter table public.billing_orders enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.applications from anon, authenticated;
revoke all on table public.billing_orders from anon, authenticated;

grant all on table public.users to service_role;
grant all on table public.sessions to service_role;
grant all on table public.applications to service_role;
grant all on table public.billing_orders to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[];
