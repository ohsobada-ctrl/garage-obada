type PublicEnvironment = Record<string, string | boolean | undefined>;

export function resolveSupabaseConfig(env: PublicEnvironment) {
  const url = String(env.VITE_SUPABASE_URL || env.LOVABLE_SUPABASE_URL || '').trim();
  // Keep URL and key from the same environment group; never fall back to a different project.
  const key = String(env.VITE_SUPABASE_URL
    ? env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
    : env.LOVABLE_SUPABASE_PUBLISHABLE_KEY || env.LOVABLE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) throw new Error('إعداد ربط قاعدة البيانات ناقص. يلزم عنوان Supabase ومفتاحه العام في إعدادات نشر التطبيق.');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('عنوان قاعدة البيانات غير صحيح.');
  if (key.startsWith('sb_secret_')) throw new Error('يجب استعمال المفتاح العام فقط في التطبيق.');
  if (key.split('.').length === 3) {
    let payload: { role?: string; ref?: string };
    try {
      const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    } catch { throw new Error('مفتاح قاعدة البيانات غير صحيح.'); }
    if (payload.role !== 'anon') throw new Error('يجب استعمال المفتاح العام فقط في التطبيق.');
    if (parsed.hostname.endsWith('.supabase.co') && payload.ref && parsed.hostname.split('.')[0] !== payload.ref) throw new Error('عنوان Supabase والمفتاح يتبعان مشروعين مختلفين. صحّح إعدادات النشر.');
  } else if (!key.startsWith('sb_publishable_')) {
    throw new Error('مفتاح Supabase العام غير صحيح.');
  }
  return { url: url.replace(/\/$/, ''), key };
}
