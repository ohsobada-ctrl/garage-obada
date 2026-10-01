export function backendError(error: { code?: string; message?: string }, action: string) {
  const code = error.code || '';
  const message = error.message || '';
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(code)) return `${action}: تحديث قاعدة البيانات غير مكتمل على مشروع Supabase المرتبط بالتطبيق (${code}).`;
  if (code === '42501' || message.includes('Admin access required')) return `${action}: الحساب لا يملك صلاحية الأدمن على الخادم. يلزم إضافته إلى garage_admins (${code || 'ADMIN_REQUIRED'}).`;
  if (code === 'PGRST301' || code === 'PGRST303') return `${action}: جلسة الدخول غير صالحة. سجّل الدخول مجدداً.`;
  return `${action}: ${message || 'تحقق من الاتصال بالإنترنت'}${code ? ` (${code})` : ''}`;
}
