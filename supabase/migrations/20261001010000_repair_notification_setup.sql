-- Durable inbox, per-device push delivery and server-authorized administration.
create table if not exists public.garage_admins (user_id uuid primary key references auth.users on delete cascade);
alter table public.garage_admins enable row level security;
create or replace function public.is_garage_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.garage_admins where user_id = auth.uid());
$$;
revoke all on function public.is_garage_admin() from public;
grant execute on function public.is_garage_admin() to authenticated;
-- Preserve the existing designated administrator, but only if the email is verified.
insert into public.garage_admins select id from auth.users where lower(email) = 'ohsobada@gmail.com' and email_confirmed_at is not null on conflict do nothing;

create table if not exists public.maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  car_id uuid not null references public.cars on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  part_year integer not null check (part_year between 1900 and 2200),
  notes text not null default '' check (length(notes) <= 2000),
  remind_at timestamptz not null,
  repeat_days integer not null default 0 check (repeat_days between 0 and 3650),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.maintenance_reminders enable row level security;
drop policy if exists own_reminders on public.maintenance_reminders;
create policy own_reminders on public.maintenance_reminders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists(select 1 from public.cars c where c.id = car_id and c.user_id = auth.uid()));
create index if not exists reminder_due on public.maintenance_reminders(remind_at) where enabled;

create table if not exists public.push_devices (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  platform text not null check (platform in ('web','android','ios')),
  subscription jsonb,
  token text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check ((platform = 'web' and subscription is not null) or (platform <> 'web' and token is not null))
);
alter table public.push_devices enable row level security;
drop policy if exists own_devices on public.push_devices;
create policy own_devices on public.push_devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists devices_user on public.push_devices(user_id) where enabled;

create table if not exists public.admin_broadcasts (
  id uuid primary key,
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 2000),
  severity text not null check (severity in ('info','warning','danger')),
  created_at timestamptz not null default now(),
  sender_id uuid references auth.users on delete set null
);
alter table public.admin_broadcasts enable row level security;
drop policy if exists admin_broadcast_read on public.admin_broadcasts;
create policy admin_broadcast_read on public.admin_broadcasts for select to authenticated using (public.is_garage_admin());

create table if not exists public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  broadcast_id uuid references public.admin_broadcasts on delete cascade,
  source_key text not null,
  title text not null,
  body text not null,
  severity text not null default 'info',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id, source_key)
);
alter table public.notification_inbox enable row level security;
drop policy if exists own_inbox_read on public.notification_inbox;
create policy own_inbox_read on public.notification_inbox for select to authenticated using (user_id = auth.uid());
drop policy if exists own_inbox_update on public.notification_inbox;
create policy own_inbox_update on public.notification_inbox for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notification_inbox from authenticated;
grant update(read_at) on public.notification_inbox to authenticated;
create index if not exists inbox_user on public.notification_inbox(user_id, created_at desc);

create table if not exists public.push_deliveries (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.notification_inbox on delete cascade,
  device_id uuid not null references public.push_devices on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','accepted','failed','skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  accepted_at timestamptz,
  unique(notification_id, device_id)
);
alter table public.push_deliveries enable row level security;
create index if not exists delivery_due on public.push_deliveries(next_attempt_at) where status in ('pending','processing');
create or replace function public.queue_inbox_push() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_deliveries(notification_id, device_id)
    select new.id, id from public.push_devices where user_id = new.user_id and enabled;
  return new;
end $$;
drop trigger if exists inbox_push on public.notification_inbox;
create trigger inbox_push after insert on public.notification_inbox for each row execute function public.queue_inbox_push();

create or replace function public.send_garage_broadcast(p_id uuid, p_title text, p_body text, p_severity text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_garage_admin() then raise exception 'Admin access required'; end if;
  insert into public.admin_broadcasts(id,title,body,severity,sender_id)
    values(p_id,trim(p_title),trim(p_body),p_severity,auth.uid()) on conflict(id) do nothing;
  insert into public.notification_inbox(user_id,broadcast_id,source_key,title,body,severity)
    select u.id,b.id,'broadcast:' || b.id,b.title,b.body,b.severity
    from auth.users u cross join public.admin_broadcasts b where b.id = p_id
    on conflict(user_id,source_key) do nothing;
  return p_id;
end $$;
revoke all on function public.send_garage_broadcast(uuid,text,text,text) from public;
grant execute on function public.send_garage_broadcast(uuid,text,text,text) to authenticated;

create or replace function public.garage_admin_report() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_garage_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'cars', (select count(*) from public.cars),
    'devices', (select count(*) from public.push_devices where enabled),
    'broadcasts', coalesce((select jsonb_agg(r) from (
      select b.*, (select count(*) from public.notification_inbox n where n.broadcast_id=b.id) as recipients,
      (select count(*) from public.notification_inbox n where n.broadcast_id=b.id and read_at is not null) as opened,
      (select count(*) from public.push_deliveries d join public.notification_inbox n on n.id=d.notification_id where n.broadcast_id=b.id and d.status='accepted') as accepted,
      (select count(*) from public.push_deliveries d join public.notification_inbox n on n.id=d.notification_id where n.broadcast_id=b.id and d.status in ('pending','processing')) as pending,
      (select count(*) from public.push_deliveries d join public.notification_inbox n on n.id=d.notification_id where n.broadcast_id=b.id and d.status='failed') as failed
      from public.admin_broadcasts b order by b.created_at desc limit 50
    ) r), '[]'::jsonb));
end $$;
revoke all on function public.garage_admin_report() from public;
grant execute on function public.garage_admin_report() to authenticated;

-- Called by a server scheduler; clients cannot enqueue arbitrary user messages.
create or replace function public.enqueue_due_reminders() returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select m.*, c.make || ' ' || c.model as car_name from public.maintenance_reminders m
    join public.cars c on c.id=m.car_id where m.enabled and m.remind_at <= now() for update of m skip locked
  loop
    insert into public.notification_inbox(user_id,source_key,title,body,severity)
      values(r.user_id,'custom:' || r.id || ':' || r.remind_at, 'تذكير تغيير ' || r.name,
      r.car_name || ' — ' || r.name || ' (' || r.part_year || ') ' || r.notes,'warning') on conflict do nothing;
    update public.maintenance_reminders set
      enabled = r.repeat_days > 0,
      remind_at = case when r.repeat_days > 0 then r.remind_at + (floor(extract(epoch from (now()-r.remind_at))/(r.repeat_days*86400.0))+1) * r.repeat_days * interval '1 day' else r.remind_at end
      where id=r.id;
  end loop;
  -- Calendar reminders for existing legal/oil/brake/tire/mileage records.
  insert into public.notification_inbox(user_id,source_key,title,body,severity)
    select c.user_id, 'car:' || c.id || ':' || s.key, 'تذكير صيانة ' || c.make || ' ' || c.model, s.body, 'warning'
    from public.cars c cross join lateral (
      select 'doc:' || (d->>'id') || ':' || (d->>'expiryDate') || ':' || days::text as key,
        'راجع موعد تجديد مستند السيارة: ' || (d->>'type') as body,
        ((d->>'expiryDate')::date::timestamp at time zone 'Africa/Tripoli') - days * interval '1 day' as due
        from jsonb_array_elements(c.legal_docs) d cross join (values(7),(0)) v(days)
      union all
      select 'oil:' || (c.oil_services->-1->>'id') || ':' || days::text,
        'حان موعد مراجعة تغيير الزيت',
        ((c.oil_services->-1->>'dateOfChange')::date::timestamp at time zone 'Africa/Tripoli') + make_interval(months => coalesce((c.settings->>'oilExpiryMonths')::int,6)) - days * interval '1 day'
        from (values(7),(0)) v(days) where jsonb_array_length(c.oil_services)>0
      union all
      select 'service:' || (s->>'id'), 'حان موعد فحص ' || case when s->>'type'='brakes' then 'البريكات' else 'الكفرات' end,
        ((s->>'lastChangeDate')::date::timestamp at time zone 'Africa/Tripoli') + make_interval(months => coalesce((c.settings->>case when s->>'type'='brakes' then 'brakeReminderMonths' else 'tireReminderMonths' end)::int,6))
        from jsonb_array_elements(c.brake_tire_services) s
      union all
      select 'mileage:' || c.last_mileage_update::text, 'حدّث عداد السيارة', c.last_mileage_update + interval '30 days'
    ) s where c.user_id is not null and s.due <= now() and s.due > now()-interval '7 days'
    on conflict(user_id,source_key) do nothing;
end $$;
revoke all on function public.enqueue_due_reminders() from public;
grant execute on function public.enqueue_due_reminders() to service_role;

create or replace function public.claim_push_deliveries() returns setof public.push_deliveries language sql security definer set search_path = '' as $$
  update public.push_deliveries set status='processing', attempts=attempts+1, next_attempt_at=now()+interval '5 minutes'
  where id in (select id from public.push_deliveries where status in ('pending','processing') and next_attempt_at<=now() and attempts<8 order by id for update skip locked limit 50) returning *;
$$;
revoke all on function public.claim_push_deliveries() from public;
grant execute on function public.claim_push_deliveries() to service_role;
-- Polling also works when realtime is unavailable.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notification_inbox') then
    alter publication supabase_realtime add table public.notification_inbox;
  end if;
end $$;
grant select,insert,update,delete on public.maintenance_reminders,public.push_devices to authenticated;
grant select on public.admin_broadcasts,public.notification_inbox to authenticated;
revoke all on public.garage_admins,public.push_deliveries from anon,authenticated;
grant all on public.garage_admins,public.maintenance_reminders,public.push_devices,public.admin_broadcasts,public.notification_inbox,public.push_deliveries to service_role;
grant usage,select on sequence public.push_deliveries_id_seq to service_role;
notify pgrst, 'reload schema';


