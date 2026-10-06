-- Legacy car JSON is not schema-validated. An invalid value in one record must
-- never roll back reminders for every other customer.
create or replace function public.garage_reminder_date(value text) returns date
language plpgsql immutable strict set search_path = '' as $$
begin
  if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  return value::date;
exception when datetime_field_overflow or invalid_datetime_format then return null;
end $$;

create or replace function public.garage_reminder_months(value text) returns integer
language plpgsql immutable set search_path = '' as $$
begin
  if value ~ '^[0-9]{1,4}$' then
    if value::integer between 1 and 1200 then return value::integer; end if;
  end if;
  return 6;
end $$;
revoke all on function public.garage_reminder_date(text), public.garage_reminder_months(text) from public;

create or replace function public.enqueue_due_reminders() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select m.*, c.make || ' ' || c.model as car_name from public.maintenance_reminders m
    join public.cars c on c.id=m.car_id and c.user_id=m.user_id
    where m.enabled and isfinite(m.remind_at) and m.remind_at <= now() for update of m skip locked
  loop
    insert into public.notification_inbox(user_id,source_key,title,body,severity)
      values(r.user_id,'custom:' || r.id || ':' || r.remind_at, 'تذكير تغيير ' || r.name,
      r.car_name || ' — ' || r.name || ' (' || r.part_year || ') ' || r.notes,'warning') on conflict do nothing;
    update public.maintenance_reminders set
      enabled = r.repeat_days > 0,
      remind_at = case when r.repeat_days > 0 then r.remind_at + (floor(extract(epoch from (now()-r.remind_at))/(r.repeat_days*86400.0))+1) * r.repeat_days * interval '1 day' else r.remind_at end
      where id=r.id;
  end loop;

  insert into public.notification_inbox(user_id,source_key,title,body,severity)
    select c.user_id, 'car:' || c.id || ':' || s.key, 'تذكير صيانة ' || c.make || ' ' || c.model, s.body, 'warning'
    from public.cars c cross join lateral (
      select case when jsonb_typeof(c.legal_docs)='array' then c.legal_docs else '[]'::jsonb end as docs,
        case when jsonb_typeof(c.oil_services)='array' then c.oil_services else '[]'::jsonb end as oils,
        case when jsonb_typeof(c.brake_tire_services)='array' then c.brake_tire_services else '[]'::jsonb end as services
    ) records cross join lateral (
      select 'doc:' || nullif(d->>'id','') || ':' || (d->>'expiryDate') || ':' || days::text as key,
        'راجع موعد تجديد مستند السيارة: ' || case d->>'type'
          when 'insurance' then 'التأمين' when 'roadTax' then 'البل' when 'technicalInspection' then 'الفحص الفني' else 'المستند' end as body,
        (public.garage_reminder_date(d->>'expiryDate')::timestamp at time zone 'Africa/Tripoli') - days * interval '1 day' as due
        from jsonb_array_elements(records.docs) d cross join (values(7),(0)) v(days)
      union all
      select 'oil:' || nullif(records.oils->-1->>'id','') || ':' || days::text,
        'حان موعد مراجعة تغيير الزيت',
        (public.garage_reminder_date(records.oils->-1->>'dateOfChange')::timestamp at time zone 'Africa/Tripoli')
          + make_interval(months => public.garage_reminder_months(c.settings->>'oilExpiryMonths')) - days * interval '1 day'
        from (values(7),(0)) v(days) where jsonb_array_length(records.oils)>0
      union all
      select 'service:' || nullif(s->>'id',''), 'حان موعد فحص ' || case when s->>'type'='brakes' then 'البريكات' else 'الكفرات' end,
        (public.garage_reminder_date(s->>'lastChangeDate')::timestamp at time zone 'Africa/Tripoli')
          + make_interval(months => public.garage_reminder_months(c.settings->>case when s->>'type'='brakes' then 'brakeReminderMonths' else 'tireReminderMonths' end))
        from jsonb_array_elements(records.services) s where s->>'type' in ('brakes','tires')
      union all
      select 'mileage:' || c.last_mileage_update::text, 'حدّث عداد السيارة', c.last_mileage_update + interval '30 days'
    ) s where c.user_id is not null and s.key is not null and s.due <= now() and s.due > now()-interval '7 days'
    on conflict(user_id,source_key) do nothing;
end $$;
revoke all on function public.enqueue_due_reminders() from public;
grant execute on function public.enqueue_due_reminders() to service_role;
notify pgrst, 'reload schema';
