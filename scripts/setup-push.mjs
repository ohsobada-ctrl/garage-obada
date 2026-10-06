import { spawnSync } from 'node:child_process';
import { createECDH } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = readFileSync(join(root, 'supabase/config.toml'), 'utf8').match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
const cli = join(root, 'node_modules/supabase/bin', process.platform === 'win32' ? 'supabase.exe' : 'supabase');
const dryRun = process.argv.includes('--dry-run');
const validateOnly = process.argv.includes('--validate-only');
const names = ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY', 'WEB_PUSH_SUBJECT', 'NOTIFICATION_CRON_SECRET'];
let folder;
const files = [];
function run(args, privateOutput = false) {
  const result = spawnSync(cli, args, { cwd: root, env: process.env, stdio: privateOutput ? 'pipe' : 'inherit' });
  // SQL failures may echo the query including secrets; never print that output.
  if (result.error || result.status !== 0) throw new Error(`Push setup failed during ${args[0]} ${args[1]}. Check deployment access and project configuration.`);
}
function save(name, content) {
  const path = join(folder, name);
  files.push(path);
  writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 });
  return path;
}
try {
  if (!project || (process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_PROJECT_REF !== project)) throw new Error('Deployment project mismatch.');
  console.log(`Push target: ${project}`);
  if (dryRun) {
    console.log(`Validate ${names.join(', ')}; upload secrets; deploy dispatcher; configure Vault and the one-minute schedule. No writes performed.`);
  } else {
    for (const name of names) if (!process.env[name]?.trim()) throw new Error(`Set ${name} in the deployment environment first.`);
    const values = Object.fromEntries(names.map(name => [name, process.env[name].trim()]));
    if (Object.values(values).some(value => /[\r\n"\\]/.test(value))) throw new Error('Web Push settings must be single-line values without quotes or backslashes.');
    if (!/^[A-Za-z0-9_-]{87}$/.test(values.WEB_PUSH_PUBLIC_KEY) || !/^[A-Za-z0-9_-]{43}$/.test(values.WEB_PUSH_PRIVATE_KEY)) throw new Error('VAPID keys must use unpadded base64url encoding (65-byte public key and 32-byte private key).');
    const key = createECDH('prime256v1');
    key.setPrivateKey(Buffer.from(values.WEB_PUSH_PRIVATE_KEY, 'base64url'));
    if (!key.getPublicKey().equals(Buffer.from(values.WEB_PUSH_PUBLIC_KEY, 'base64url'))) throw new Error('VAPID public/private keys do not match.');
    if (!/^mailto:[^\s@]+@[^\s@]+$/.test(values.WEB_PUSH_SUBJECT) && !/^https:\/\/[^\s]+$/.test(values.WEB_PUSH_SUBJECT)) throw new Error('WEB_PUSH_SUBJECT must be a support mailto: or HTTPS URL.');
    if (!/^[A-Za-z0-9_-]{32,}$/.test(values.NOTIFICATION_CRON_SECRET)) throw new Error('Use a random base64url cron secret of at least 32 characters.');
    if (process.env.VITE_WEB_PUSH_PUBLIC_KEY && process.env.VITE_WEB_PUSH_PUBLIC_KEY !== values.WEB_PUSH_PUBLIC_KEY) throw new Error('Frontend VAPID key differs from server key.');
    if (validateOnly) {
      console.log('Push deployment settings validated. No writes performed.');
    } else {
      folder = mkdtempSync(join(tmpdir(), 'garage-push-'));
      run(['link', '--project-ref', project, '--yes']);
      run(['secrets', 'set', '--project-ref', project, '--env-file', save('push.env', Object.entries(values).map(([name, value]) => `${name}="${value}"`).join('\n'))], true);
      run(['functions', 'deploy', 'dispatch-notifications', '--project-ref', project]);
      const quote = value => `'${value.replaceAll("'", "''")}'`;
      const vault = Object.entries({ garage_project_url: `https://${project}.supabase.co`, garage_notification_cron_secret: values.NOTIFICATION_CRON_SECRET }).map(([name, value]) => `
        do $garage$ declare secret_id uuid; begin
          select id into secret_id from vault.secrets where name=${quote(name)};
          if secret_id is null then perform vault.create_secret(${quote(value)}, ${quote(name)});
          else perform vault.update_secret(secret_id, ${quote(value)}, ${quote(name)}); end if;
        end $garage$;`).join('\n');
      const schedule = readFileSync(join(root, 'supabase/setup-notification-cron.sql'), 'utf8');
      run(['db', 'query', '--linked', '--file', save('schedule.sql', `begin;\n${vault}\n${schedule}\ncommit;`)], true);
      console.log('Web Push secrets, dispatcher and schedule configured. Rebuild the frontend with the matching public key, then verify delivery on real devices.');
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Remove only files created here, then the empty task directory (no recursive delete).
  for (const path of files) { try { unlinkSync(path); } catch { console.error('Could not remove a temporary deployment file.'); } }
  if (folder) { try { rmdirSync(folder); } catch { console.error('Could not remove the temporary deployment directory.'); } }
}
