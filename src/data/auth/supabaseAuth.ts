import type { AuthError, Session as SbSession } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { AppError } from '../errors';
import type { AuthService, OAuthProvider, Session, SignUpInput } from './types';
import type { PlatformRole } from '../types';

function mapError(e: AuthError | null): never | void {
  if (!e) return;
  const m = e.message.toLowerCase();
  if (m.includes('invalid login')) throw new AppError('invalid_credentials');
  if (m.includes('not confirmed')) throw new AppError('email_not_verified');
  if (m.includes('already registered')) throw new AppError('email_taken');
  if (m.includes('password')) throw new AppError('weak_password');
  if (e.status === 429) throw new AppError('rate_limited');
  throw new AppError('unknown', e.message);
}

async function toSession(s: SbSession | null): Promise<Session | null> {
  if (!s) return null;
  const sb = getSupabase();
  // platform roles are granted server-side only; RLS lets a user read their own role rows
  const { data } = await sb.from('user_roles').select('role').eq('user_id', s.user.id);
  const roles = new Set<PlatformRole>(['shopper', ...((data ?? []).map((r) => r.role as PlatformRole))]);
  return { userId: s.user.id, email: s.user.email ?? '', emailVerified: Boolean(s.user.email_confirmed_at), roles: [...roles] };
}

export class SupabaseAuth implements AuthService {
  readonly mode = 'supabase' as const;
  async getSession() {
    const { data } = await getSupabase().auth.getSession();
    return toSession(data.session);
  }
  onChange(cb: (s: Session | null) => void) {
    const { data } = getSupabase().auth.onAuthStateChange((_e, s) => {
      void toSession(s).then(cb);
    });
    return () => data.subscription.unsubscribe();
  }
  async signUp(input: SignUpInput) {
    const { data, error } = await getSupabase().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: `${location.origin}/auth/verify`,
        // consumed by the handle_new_user() trigger to create the profile + consent record
        data: {
          display_name: input.displayName,
          username: input.username,
          locale: input.locale,
          country: input.country,
          terms_version: input.acceptedTermsVersion,
          marketing_opt_in: input.marketingOptIn,
        },
      },
    });
    mapError(error);
    return { needsVerification: !data.session };
  }
  async signIn(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    mapError(error);
    return (await toSession(data.session))!;
  }
  async signInWithProvider(provider: OAuthProvider) {
    const { error } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/` } });
    mapError(error);
  }
  async signOut() {
    await getSupabase().auth.signOut();
  }
  async requestPasswordReset(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/reset` });
    mapError(error);
    return {};
  }
  async resetPassword(_email: string | null, _code: string | null, newPassword: string) {
    // recovery link establishes a session; update the password for that session
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    mapError(error);
  }
  async verifyEmail(email: string, code: string) {
    const { data, error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'signup' });
    mapError(error);
    return (await toSession(data.session))!;
  }
  async resendVerification(email: string) {
    const { error } = await getSupabase().auth.resend({ type: 'signup', email });
    mapError(error);
    return {};
  }
}
