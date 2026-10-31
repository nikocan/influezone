import { AppError } from '../errors';
import { getDB, mutate, type DemoAccount } from '../demo/store';
import { uid } from '@/lib/utils';
import type { AuthService, Session, SignUpInput } from './types';
import { EMAIL_RE, passwordStrength } from './types';
import type { PlatformRole } from '../types';

const SESSION_KEY = 'sf.demo.session';
const CODES_KEY = 'sf.demo.codes';

async function hash(pw: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pw}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function code6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readCodes(): Record<string, { code: string; purpose: 'verify' | 'reset'; exp: number }> {
  try {
    return JSON.parse(localStorage.getItem(CODES_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeCode(email: string, purpose: 'verify' | 'reset') {
  const c = code6();
  const all = readCodes();
  all[`${purpose}:${email}`] = { code: c, purpose, exp: Date.now() + 15 * 60_000 };
  localStorage.setItem(CODES_KEY, JSON.stringify(all));
  return c;
}
function checkCode(email: string, purpose: 'verify' | 'reset', code: string) {
  const all = readCodes();
  const rec = all[`${purpose}:${email}`];
  if (!rec || rec.exp < Date.now() || rec.code !== code.trim()) return false;
  delete all[`${purpose}:${email}`];
  localStorage.setItem(CODES_KEY, JSON.stringify(all));
  return true;
}

function toSession(a: DemoAccount): Session {
  return { userId: a.id, email: a.email, emailVerified: a.emailVerified, roles: a.roles };
}

/**
 * DEMO authentication. Accounts live only in this browser's localStorage.
 * No e-mail is actually sent: verification / reset codes are shown on screen and labelled as demo.
 */
export class DemoAuth implements AuthService {
  readonly mode = 'demo' as const;
  private listeners = new Set<(s: Session | null) => void>();

  private current(): Session | null {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const a = getDB().accounts.find((x) => x.id === id);
    return a ? toSession(a) : null;
  }
  private emit() {
    const s = this.current();
    this.listeners.forEach((l) => l(s));
  }
  async getSession() {
    return this.current();
  }
  onChange(cb: (s: Session | null) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  async signUp(input: SignUpInput) {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new AppError('validation');
    if (passwordStrength(input.password) < 2) throw new AppError('weak_password');
    if (!/^[a-z0-9_.]{3,30}$/.test(input.username)) throw new AppError('invalid_username');
    const d = getDB();
    if (d.accounts.some((a) => a.email === email)) throw new AppError('email_taken');
    if (d.profiles.some((p) => p.username === input.username)) throw new AppError('username_taken');
    const id = uid('u');
    const passwordHash = await hash(input.password, id);
    mutate((db) => {
      db.accounts.push({ id, email, passwordHash, emailVerified: false, createdAt: new Date().toISOString(), roles: ['shopper'] });
      db.profiles.push({
        id, username: input.username, displayName: input.displayName.trim() || input.username, avatarUrl: null, bio: '', country: input.country, locale: input.locale,
        kind: 'person', isCreator: false, verified: false, website: null, interests: [], onboardingCompleted: false, isPrivate: false,
        followerCount: 0, followingCount: 0, postCount: 0, createdAt: new Date().toISOString(), isSample: false,
      });
    });
    const demoCode = writeCode(email, 'verify');
    return { needsVerification: true, demoCode };
  }
  async signIn(email: string, password: string) {
    const e = email.trim().toLowerCase();
    const a = getDB().accounts.find((x) => x.email === e);
    if (!a || (await hash(password, a.id)) !== a.passwordHash) throw new AppError('invalid_credentials');
    if (!a.emailVerified) throw new AppError('email_not_verified');
    localStorage.setItem(SESSION_KEY, a.id);
    this.emit();
    return toSession(a);
  }
  async signInWithProvider(): Promise<void> {
    throw new AppError('not_configured');
  }
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    this.emit();
  }
  async requestPasswordReset(email: string) {
    const e = email.trim().toLowerCase();
    // Do not reveal whether the account exists.
    if (!getDB().accounts.some((a) => a.email === e)) return {};
    return { demoCode: writeCode(e, 'reset') };
  }
  async resetPassword(email: string | null, code: string | null, newPassword: string) {
    if (!email || !code) throw new AppError('validation');
    if (passwordStrength(newPassword) < 2) throw new AppError('weak_password');
    const e = email.trim().toLowerCase();
    if (!checkCode(e, 'reset', code)) throw new AppError('validation');
    const a = getDB().accounts.find((x) => x.email === e);
    if (!a) throw new AppError('validation');
    const passwordHash = await hash(newPassword, a.id);
    mutate((db) => {
      const acc = db.accounts.find((x) => x.id === a.id)!;
      acc.passwordHash = passwordHash;
    });
  }
  async verifyEmail(email: string, code: string) {
    const e = email.trim().toLowerCase();
    if (!checkCode(e, 'verify', code)) throw new AppError('validation');
    const a = mutate((db) => {
      const acc = db.accounts.find((x) => x.email === e);
      if (!acc) throw new AppError('not_found');
      acc.emailVerified = true;
      return acc;
    });
    localStorage.setItem(SESSION_KEY, a.id);
    this.emit();
    return toSession(a);
  }
  async resendVerification(email: string) {
    const e = email.trim().toLowerCase();
    if (!getDB().accounts.some((a) => a.email === e && !a.emailVerified)) return {};
    return { demoCode: writeCode(e, 'verify') };
  }
  async grantDemoRole(role: PlatformRole) {
    const s = this.current();
    if (!s) throw new AppError('auth_required');
    mutate((db) => {
      const a = db.accounts.find((x) => x.id === s.userId)!;
      if (!a.roles.includes(role)) a.roles.push(role);
    });
    this.emit();
  }
}
