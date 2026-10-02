import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';
import { pushPreview } from './payload.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
class ProviderError extends Error {
  constructor(message: string, public expired = false) { super(message); }
}
let googleToken: { value: string; expires: number } | undefined;
async function fcmToken() {
  if (googleToken && googleToken.expires > Date.now()) return googleToken.value;
  const account = JSON.parse(required('FCM_SERVICE_ACCOUNT'));
  const key = await importPKCS8(account.private_key, 'RS256');
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`FCM authentication ${response.status}`);
  const result = await response.json();
  googleToken = { value: result.access_token, expires: Date.now() + 3000000 };
  return googleToken.value;
}
type Device = { platform: string; token: string; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } };
type Message = { id: string; title: string; body: string };
async function send(device: Device, message: Message) {
  if (device.platform === 'web') {
    // Subscriptions are user input: never let a push endpoint target private services.
    const endpoint = new URL(device.subscription.endpoint);
    const host = endpoint.hostname;
    if (endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password || !(
      host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.services.mozilla.com') || host.endsWith('.push.apple.com') ||
      host === 'web.push.apple.com' || host.endsWith('.notify.windows.com')
    )) throw new ProviderError('Unsupported push endpoint', true);
    try {
      await webpush.sendNotification(device.subscription, JSON.stringify(message), {
        vapidDetails: { subject: required('WEB_PUSH_SUBJECT'), publicKey: required('WEB_PUSH_PUBLIC_KEY'), privateKey: required('WEB_PUSH_PRIVATE_KEY') },
        TTL: 86400, urgency: 'high', timeout: 15000,
      });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      throw new ProviderError(`Web Push ${status ?? 'configuration/network error'}`, status === 404 || status === 410);
    }
    return;
  }
  let response: Response;
  if (device.platform === 'android') {
    const account = JSON.parse(required('FCM_SERVICE_ACCOUNT'));
    response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
      method: 'POST', headers: { Authorization: `Bearer ${await fcmToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: device.token, notification: { title: message.title, body: message.body },
        data: { id: message.id }, android: { priority: 'high', ttl: '86400s', notification: { channel_id: 'garage-push', tag: message.id, sound: 'default' } } } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const result = await response.json();
      const expired = result.error?.details?.some((d: { errorCode?: string }) => d.errorCode === 'UNREGISTERED');
      throw new ProviderError(`FCM ${response.status}`, expired);
    }
  } else {
    const key = await importPKCS8(required('APNS_PRIVATE_KEY').replace(/\\n/g, '\n'), 'ES256');
    const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: required('APNS_KEY_ID') })
      .setIssuer(required('APNS_TEAM_ID')).setIssuedAt().sign(key);
    const host = Deno.env.get('APNS_SANDBOX') === 'true' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    response = await fetch(`https://${host}/3/device/${encodeURIComponent(device.token)}`, {
      method: 'POST', headers: { authorization: `bearer ${jwt}`, 'apns-topic': required('APNS_BUNDLE_ID'),
        'apns-push-type': 'alert', 'apns-priority': '10', 'apns-collapse-id': message.id,
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400) },
      body: JSON.stringify({ aps: { alert: { title: message.title, body: message.body }, sound: 'default' }, id: message.id }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new ProviderError(`APNs ${response.status}: ${result.reason}`, response.status === 410 || result.reason === 'BadDeviceToken');
    }
  }
}

Deno.serve(async request => {
  // A separate cron secret prevents a signed-in client from invoking the worker.
  if (request.method !== 'POST' || !Deno.env.get('NOTIFICATION_CRON_SECRET') || request.headers.get('x-cron-secret') !== Deno.env.get('NOTIFICATION_CRON_SECRET')) return new Response('Unauthorized', { status: 401 });
  try {
    const { error: reminderError } = await db.rpc('enqueue_due_reminders');
    // A malformed legacy maintenance record must not block queued admin messages.
    if (reminderError) console.error('Reminder enqueue failed', reminderError.code);
    await db.from('push_deliveries').update({ status: 'failed', last_error: 'Retry limit reached' }).in('status', ['pending','processing']).gte('attempts', 8).lte('next_attempt_at', new Date().toISOString());
    const { data: jobs, error } = await db.rpc('claim_push_deliveries');
    if (error) throw error;
    // Bounded parallel sends; leases protect against concurrent cron invocations.
    for (let offset = 0; offset < jobs.length; offset += 10) {
      await Promise.all(jobs.slice(offset, offset + 10).map(async (job: { id: number; device_id: string; notification_id: string; attempts: number }) => {
        try {
          const [{ data: device, error: deviceError }, { data: message, error: messageError }] = await Promise.all([
            db.from('push_devices').select('*').eq('id', job.device_id).maybeSingle(),
            db.from('notification_inbox').select('*').eq('id', job.notification_id).maybeSingle(),
          ]);
          if (deviceError || messageError) throw deviceError || messageError;
          if (!device || !message || !device.enabled || device.user_id !== message.user_id) {
            await db.from('push_deliveries').update({ status: 'skipped' }).eq('id', job.id); return;
          }
          await send(device, pushPreview({ id: message.id, title: message.title, body: message.body }));
          const { error } = await db.from('push_deliveries').update({ status: 'accepted', accepted_at: new Date().toISOString(), last_error: null }).eq('id', job.id);
          if (error) throw error;
        } catch (error) {
          const expired = error instanceof ProviderError && error.expired;
          if (expired) await db.from('push_devices').update({ enabled: false }).eq('id', job.device_id);
          await db.from('push_deliveries').update({ status: expired || job.attempts >= 8 ? 'failed' : 'pending',
            last_error: error instanceof Error ? error.message.slice(0, 200) : 'Database/network error',
            next_attempt_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000).toISOString(),
          }).eq('id', job.id);
        }
      }));
    }
    return Response.json({ processed: jobs.length, remindersQueued: !reminderError });
  } catch (error) {
    console.error('Notification dispatch failed', error instanceof Error ? error.message : 'Database error');
    return new Response('Dispatch failed', { status: 500 });
  }
});
