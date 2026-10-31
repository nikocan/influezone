import type { PlatformRole } from '../types';

export interface Session {
  userId: string;
  email: string;
  emailVerified: boolean;
  /** platform-scoped roles granted server-side (admin/moderator). Creator & brand come from profile / org membership. */
  roles: PlatformRole[];
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  username: string;
  locale: string;
  country: string;
  acceptedTermsVersion: string;
  marketingOptIn: boolean;
}

export type OAuthProvider = 'google' | 'apple';

export interface AuthService {
  readonly mode: 'demo' | 'supabase';
  getSession(): Promise<Session | null>;
  onChange(cb: (s: Session | null) => void): () => void;
  signUp(input: SignUpInput): Promise<{ needsVerification: boolean; demoCode?: string }>;
  signIn(email: string, password: string): Promise<Session>;
  signInWithProvider(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<{ demoCode?: string }>;
  resetPassword(emailOrNull: string | null, code: string | null, newPassword: string): Promise<void>;
  verifyEmail(email: string, code: string): Promise<Session>;
  resendVerification(email: string): Promise<{ demoCode?: string }>;
  /** demo only */
  grantDemoRole?(role: PlatformRole): Promise<void>;
}

export const TERMS_VERSION = '2026-10-01';

export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
