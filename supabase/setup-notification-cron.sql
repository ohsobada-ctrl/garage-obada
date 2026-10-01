-- Run AFTER the migration and deploying dispatch-notifications.
-- In Supabase Vault, first create garage_project_url and garage_notification_cron_secret.
-- The latter must match the Edge Function secret NOTIFICATION_CRON_SECRET.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if exists(select 1 from cron.job where jobname='garage-notification-dispatch') then
    perform cron.unschedule('garage-notification-dispatch');
  end if;
end $$;
select cron.schedule('garage-notification-dispatch', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='garage_project_url') || '/functions/v1/dispatch-notifications',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='garage_notification_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
