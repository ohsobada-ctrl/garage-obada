import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('notification migration: RLS, broadcast fanout, idempotency, reminders and leases', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create publication supabase_realtime;
      grant usage on schema public,auth to authenticated,service_role;
      alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20260510000000_init_garage.sql', import.meta.url), 'utf8'));
    const admin = '11111111-1111-4111-8111-111111111111';
    const user = '22222222-2222-4222-8222-222222222222';
    await db.exec(`alter table auth.users add column raw_user_meta_data jsonb default '{}'; alter table auth.users add column phone text;
      insert into auth.users values ('${admin}','ohsobada@gmail.com',now(),'{}',null),('${user}','user@example.com',now(),'{}',null);`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261001010000_repair_notification_setup.sql', import.meta.url), 'utf8'));
    // Recovery from a partial installation must also be safe to run again.
    await db.exec(await readFile(new URL('../supabase/migrations/20261001010000_repair_notification_setup.sql', import.meta.url), 'utf8'));
    await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false);`);
    assert.equal((await db.query('select public.is_garage_admin() as ok')).rows[0].ok, true);
    await db.exec(`insert into push_devices(id,user_id,platform,token) values
      ('33333333-3333-4333-8333-333333333333','${user}','ios','token1'),
      ('44444444-4444-4444-8444-444444444444','${user}','android','token2');`);
    const broadcast = '55555555-5555-4555-8555-555555555555';
    await db.exec(`select send_garage_broadcast('${broadcast}','Test','Body','info'); select send_garage_broadcast('${broadcast}','Test','Body','info');`);
    assert.equal((await db.query('select count(*)::int as n from notification_inbox')).rows[0].n, 2);
    assert.equal((await db.query('select count(*)::int as n from push_deliveries')).rows[0].n, 2);
    const report = (await db.query('select garage_admin_report() as r')).rows[0].r;
    assert.equal(report.users, 2);
    assert.equal(report.broadcasts[0].recipients, 2);
    assert.equal(report.broadcasts[0].accepted, 0);
    assert.equal((await db.query('select * from claim_push_deliveries()')).rows.length, 2);
    assert.equal((await db.query('select * from claim_push_deliveries()')).rows.length, 0);
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`);
    await assert.rejects(db.query('select garage_admin_report()'), /Admin access required/);
    await assert.rejects(db.query(`select send_garage_broadcast('${broadcast}','Spoof','Body','info')`), /Admin access required/);
    assert.equal((await db.query('select * from notification_inbox')).rows.length, 1);
    await db.exec(`update notification_inbox set read_at=now() where read_at is null;`);
    assert.equal((await db.query('select count(*)::int as n from notification_inbox where read_at is not null')).rows[0].n, 1);
    await assert.rejects(db.exec(`update notification_inbox set body='spoof'`), /permission denied/);
    await db.exec('reset role');
    const car = '66666666-6666-4666-8666-666666666666';
    await db.exec(`insert into cars(id,user_id,make,model,year,legal_docs,oil_services,brake_tire_services) values
      ('${car}','${user}','Toyota','Test',2020,
       jsonb_build_array(jsonb_build_object('id','doc','type','insurance','expiryDate',current_date::text)),
       jsonb_build_array(jsonb_build_object('id','oil','dateOfChange',(current_date-interval '12 months')::date::text)),
       jsonb_build_array(jsonb_build_object('id','brake','type','brakes','lastChangeDate',(current_date-interval '6 months')::date::text)));
      insert into maintenance_reminders(user_id,car_id,name,part_year,remind_at,repeat_days)
        values('${user}','${car}','Battery',2024,now()-interval '10 days',2),('${user}','${car}','Belt',2025,now()-interval '1 hour',0);
      select enqueue_due_reminders();`);
    const reminders = (await db.query('select name,enabled,remind_at>now() as future from maintenance_reminders order by name')).rows;
    assert.equal(reminders[0].future, true); assert.equal(reminders[0].enabled, true); assert.equal(reminders[1].enabled, false);
    const count = (await db.query('select count(*)::int as n from notification_inbox')).rows[0].n;
    assert.ok(count >= 7, `Expected existing maintenance and custom alerts, got ${count}`);
    await db.exec('select enqueue_due_reminders()');
    assert.equal((await db.query('select count(*)::int as n from notification_inbox')).rows[0].n, count);
  } finally { await db.close(); }
});


