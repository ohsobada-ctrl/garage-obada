export type BackendFailure = { code?: string; message?: string };

export function errorMessage(error: unknown, fallback = 'تعذر إتمام العملية. حاول مجدداً') {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message : fallback;
}

export function isBackendSetupError(error: BackendFailure | null | undefined) {
  return !!error && ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code || '');
}

export function shouldRetryBackend(failureCount: number, error: BackendFailure) {
  // Missing schema and denied access need a fix, not an endless polling loop.
  return !isBackendSetupError(error) && !['42501', 'PGRST301', 'PGRST303'].includes(error.code || '') && !error.message?.includes('Admin access required') && failureCount < 2;
}

export function backendError(error: BackendFailure, action: string) {
  const code = error.code || '';
  const message = error.message || '';
  if (isBackendSetupError(error)) return `${action}: تحديث قاعدة البيانات غير مكتمل على مشروع Supabase المرتبط بالتطبيق (${code}).`;
  if (message.includes('Admin access required')) return `${action}: الحساب لا يملك صلاحية الأدمن على الخادم. يلزم إضافته إلى garage_admins (${code || 'ADMIN_REQUIRED'}).`;
  if (code === '42501') return `${action}: لا يملك الحساب صلاحية الوصول لهذه البيانات. سجّل الدخول بالحساب الصحيح.`;
  if (code === 'PGRST301' || code === 'PGRST303') return `${action}: جلسة الدخول غير صالحة. سجّل الدخول مجدداً.`;
  return `${action}: ${message || 'تحقق من الاتصال بالإنترنت'}${code ? ` (${code})` : ''}`;
}
