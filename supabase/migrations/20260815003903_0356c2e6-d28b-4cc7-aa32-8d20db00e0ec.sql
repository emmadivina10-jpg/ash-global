
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create type public.service_category as enum ('BRAIDER','NAIL_TECH','LASH_TECH','MAKEUP','BARBER','OTHER');
create type public.booking_status as enum ('PENDING','CONFIRMED','COMPLETED','CANCELLED','DECLINED');
create type public.subscription_status as enum ('PENDING','ACTIVE','EXPIRED','FAILED');

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  bio text,
  city text,
  phone text,
  whatsapp text,
  categories public.service_category[] not null default '{}',
  avatar_url text,
  cover_url text,
  is_live boolean not null default false,
  subscription_expires_at timestamptz,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.provider_profiles to authenticated;
grant all on public.provider_profiles to service_role;
alter table public.provider_profiles enable row level security;
create policy "Live providers are visible to signed-in users"
  on public.provider_profiles for select to authenticated
  using (is_live = true or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Users create their own provider profile"
  on public.provider_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "Users update their own provider profile"
  on public.provider_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete their own provider profile"
  on public.provider_profiles for delete to authenticated using (user_id = auth.uid());

create or replace function public.is_provider_owner(_provider_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.provider_profiles p where p.id = _provider_id and p.user_id = auth.uid())
$$;
revoke all on function public.is_provider_owner(uuid) from public, anon;
grant execute on function public.is_provider_owner(uuid) to authenticated;

create or replace function public.is_provider_visible(_provider_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.provider_profiles p
    where p.id = _provider_id and (p.is_live = true or p.user_id = auth.uid())
  )
$$;
revoke all on function public.is_provider_visible(uuid) from public, anon;
grant execute on function public.is_provider_visible(uuid) to authenticated;

create table public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  title text not null,
  description text,
  category public.service_category not null default 'OTHER',
  price integer not null check (price >= 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.provider_services (provider_id);
grant select, insert, update, delete on public.provider_services to authenticated;
grant all on public.provider_services to service_role;
alter table public.provider_services enable row level security;
create policy "Services of visible providers are readable"
  on public.provider_services for select to authenticated
  using (public.is_provider_visible(provider_id) or public.has_role(auth.uid(),'admin'));
create policy "Providers insert own services"
  on public.provider_services for insert to authenticated with check (public.is_provider_owner(provider_id));
create policy "Providers update own services"
  on public.provider_services for update to authenticated using (public.is_provider_owner(provider_id)) with check (public.is_provider_owner(provider_id));
create policy "Providers delete own services"
  on public.provider_services for delete to authenticated using (public.is_provider_owner(provider_id));

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  service_id uuid references public.provider_services(id) on delete set null,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index on public.portfolio_items (provider_id);
grant select, insert, update, delete on public.portfolio_items to authenticated;
grant all on public.portfolio_items to service_role;
alter table public.portfolio_items enable row level security;
create policy "Portfolio of visible providers is readable"
  on public.portfolio_items for select to authenticated
  using (public.is_provider_visible(provider_id) or public.has_role(auth.uid(),'admin'));
create policy "Providers insert own portfolio"
  on public.portfolio_items for insert to authenticated with check (public.is_provider_owner(provider_id));
create policy "Providers update own portfolio"
  on public.portfolio_items for update to authenticated using (public.is_provider_owner(provider_id)) with check (public.is_provider_owner(provider_id));
create policy "Providers delete own portfolio"
  on public.portfolio_items for delete to authenticated using (public.is_provider_owner(provider_id));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  service_id uuid references public.provider_services(id) on delete set null,
  service_title text not null,
  price integer not null default 0,
  scheduled_at timestamptz not null,
  notes text,
  status public.booking_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bookings (provider_id, scheduled_at);
create index on public.bookings (client_id, scheduled_at);
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "Clients and providers read their bookings"
  on public.bookings for select to authenticated
  using (client_id = auth.uid() or public.is_provider_owner(provider_id) or public.has_role(auth.uid(),'admin'));
create policy "Clients create their bookings"
  on public.bookings for insert to authenticated with check (client_id = auth.uid());
create policy "Clients and providers update their bookings"
  on public.bookings for update to authenticated
  using (client_id = auth.uid() or public.is_provider_owner(provider_id))
  with check (client_id = auth.uid() or public.is_provider_owner(provider_id));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index on public.reviews (provider_id);
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "Reviews of visible providers are readable"
  on public.reviews for select to authenticated
  using (public.is_provider_visible(provider_id) or client_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Clients review their completed bookings"
  on public.reviews for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id and b.client_id = auth.uid()
        and b.provider_id = reviews.provider_id and b.status = 'COMPLETED'
    )
  );
create policy "Clients update their own reviews"
  on public.reviews for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "Clients delete their own reviews"
  on public.reviews for delete to authenticated using (client_id = auth.uid());

create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare _pid uuid;
begin
  _pid := coalesce(new.provider_id, old.provider_id);
  update public.provider_profiles p
     set rating_avg = coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.provider_id = _pid),0),
         rating_count = (select count(*) from public.reviews r where r.provider_id = _pid),
         updated_at = now()
   where p.id = _pid;
  return null;
end $$;
create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_provider_rating();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider_id, client_id)
);
grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "Participants read conversations"
  on public.conversations for select to authenticated
  using (client_id = auth.uid() or public.is_provider_owner(provider_id));
create policy "Participants start conversations"
  on public.conversations for insert to authenticated
  with check (client_id = auth.uid() or public.is_provider_owner(provider_id));
create policy "Participants update conversations"
  on public.conversations for update to authenticated
  using (client_id = auth.uid() or public.is_provider_owner(provider_id))
  with check (client_id = auth.uid() or public.is_provider_owner(provider_id));

create or replace function public.is_conversation_participant(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    join public.provider_profiles p on p.id = c.provider_id
    where c.id = _conversation_id and (c.client_id = auth.uid() or p.user_id = auth.uid())
  )
$$;
revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Participants read messages"
  on public.messages for select to authenticated using (public.is_conversation_participant(conversation_id));
create policy "Participants send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy "Participants mark messages read"
  on public.messages for update to authenticated
  using (public.is_conversation_participant(conversation_id))
  with check (public.is_conversation_participant(conversation_id));

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end $$;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation();

alter table public.messages replica identity full;
do $$ begin
  execute 'alter publication supabase_realtime add table public.messages';
exception when others then null; end $$;

create table public.provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null default 2000,
  currency text not null default 'XAF',
  payment_provider text not null default 'TCHOKOPAY',
  payment_reference text unique,
  provider_transaction_id text,
  status public.subscription_status not null default 'PENDING',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.provider_subscriptions (provider_id);
grant select on public.provider_subscriptions to authenticated;
grant all on public.provider_subscriptions to service_role;
alter table public.provider_subscriptions enable row level security;
create policy "Users read their own subscriptions"
  on public.provider_subscriptions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.complete_provider_subscription(_payment_reference text, _provider_transaction_id text default null)
returns void language plpgsql security definer set search_path = public as $$
declare _sub public.provider_subscriptions%rowtype; _start timestamptz; _end timestamptz;
begin
  select * into _sub from public.provider_subscriptions where payment_reference = _payment_reference for update;
  if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
  if _sub.status = 'ACTIVE' then return; end if;

  select greatest(now(), coalesce(p.subscription_expires_at, now())) into _start
    from public.provider_profiles p where p.id = _sub.provider_id;
  _end := _start + interval '30 days';

  update public.provider_subscriptions
     set status = 'ACTIVE', provider_transaction_id = _provider_transaction_id,
         period_start = _start, period_end = _end, updated_at = now()
   where id = _sub.id;

  update public.provider_profiles
     set is_live = true, subscription_expires_at = _end, updated_at = now()
   where id = _sub.provider_id;
end $$;
revoke all on function public.complete_provider_subscription(text, text) from public, anon, authenticated;
grant execute on function public.complete_provider_subscription(text, text) to service_role;

create trigger provider_profiles_updated_at before update on public.provider_profiles
for each row execute function public.touch_updated_at();
create trigger provider_services_updated_at before update on public.provider_services
for each row execute function public.touch_updated_at();
create trigger bookings_updated_at before update on public.bookings
for each row execute function public.touch_updated_at();
create trigger provider_subscriptions_updated_at before update on public.provider_subscriptions
for each row execute function public.touch_updated_at();

create policy "Signed-in users view portfolio images" on storage.objects for select to authenticated
  using (bucket_id = 'portfolio');
create policy "Users upload own portfolio images" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own portfolio images" on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own portfolio images" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
