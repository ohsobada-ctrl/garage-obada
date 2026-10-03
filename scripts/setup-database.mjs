import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');
const projectRef = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
if (!projectRef) throw new Error('Missing project_id in supabase/config.toml');
if (process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_PROJECT_REF !== projectRef) {
  throw new Error('Deployment project differs from supabase/config.toml. Refusing to modify another database.');
}
const cli = join(root, 'node_modules/supabase/bin', process.platform === 'win32' ? 'supabase.exe' : 'supabase');
const dryRun = process.argv.includes('--dry-run');
function run(args) {
  console.log(`supabase ${args.join(' ')}`);
  if (dryRun) return;
  const result = spawnSync(cli, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Database setup stopped. Resolve the reported authentication or SQL error before retrying.');
}

// Replay only the tested, idempotent repair. Historical migrations include unrelated
// changes and must not be guessed as applied on an existing production database.
const migration = readFileSync(join(root, 'supabase/migrations/20261001010000_repair_notification_setup.sql'), 'utf8');
const verify = `
do $$ begin
  if to_regclass('public.notification_inbox') is null
     or to_regclass('public.maintenance_reminders') is null
     or to_regclass('public.push_devices') is null
     or to_regprocedure('public.garage_admin_report()') is null
     or to_regprocedure('public.send_garage_broadcast(uuid,text,text,text)') is null then
    raise exception 'Incomplete notification schema';
  end if;
end $$;
`;
let taskDir;
try {
  console.log(`Target project: ${projectRef}${dryRun ? ' (preview only)' : ''}`);
  if (!dryRun && !existsSync(cli)) throw new Error('Run npm ci before database setup.');
  // Link and query use the official CLI's stored login or SUPABASE_ACCESS_TOKEN.
  run(['link', '--project-ref', projectRef, '--yes']);
  if (dryRun) {
    console.log('Apply the notification repair and verify it within one transaction. No database writes performed.');
  } else {
    taskDir = mkdtempSync(join(tmpdir(), 'garage-db-'));
    const sqlFile = resolve(taskDir, 'repair.sql');
    writeFileSync(sqlFile, `begin;\n${migration}\n${verify}\ncommit;\n`, 'utf8');
    run(['db', 'query', '--linked', '--file', sqlFile]);
    console.log('Notification database setup and verification succeeded.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Only the file created here and its empty directory are removed.
  if (taskDir) {
    const sqlFile = join(taskDir, 'repair.sql');
    if (existsSync(sqlFile)) unlinkSync(sqlFile);
    rmdirSync(taskDir);
  }
}
