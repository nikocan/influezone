import { DemoAuth } from './demoAuth';
import { __fresh, __setDB } from '../demo/store';
import { AppError } from '../errors';

const auth = new DemoAuth();
const input = { email: 'Ada@Example.com', password: 'Strong!Pass1', displayName: 'Ada', username: 'ada', locale: 'tr', country: 'TR', acceptedTermsVersion: 'v1', marketingOptIn: false };

beforeEach(() => { localStorage.clear(); __setDB(__fresh()); });

describe('DemoAuth', () => {
  it('registration → verification → sign-in', async () => {
    const r = await auth.signUp(input);
    expect(r.needsVerification).toBe(true);
    await expect(auth.signIn('ada@example.com', input.password)).rejects.toMatchObject({ code: 'email_not_verified' });
    await expect(auth.verifyEmail('ada@example.com', '000000')).rejects.toBeInstanceOf(AppError);
    const s = await auth.verifyEmail('ada@example.com', r.demoCode!);
    expect(s.emailVerified).toBe(true);
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    await expect(auth.signIn('ada@example.com', 'wrong')).rejects.toMatchObject({ code: 'invalid_credentials' });
    expect((await auth.signIn('ADA@example.com', input.password)).roles).toEqual(['shopper']);
  });
  it('rejects weak passwords, duplicates and bad usernames', async () => {
    await expect(auth.signUp({ ...input, password: 'abc' })).rejects.toMatchObject({ code: 'weak_password' });
    await expect(auth.signUp({ ...input, username: 'Bad Name' })).rejects.toMatchObject({ code: 'invalid_username' });
    await auth.signUp(input);
    await expect(auth.signUp({ ...input, username: 'ada2' })).rejects.toMatchObject({ code: 'email_taken' });
    await expect(auth.signUp({ ...input, email: 'b@example.com', username: 'elif.stil' })).rejects.toMatchObject({ code: 'username_taken' });
  });
  it('password reset does not reveal unknown accounts', async () => {
    expect(await auth.requestPasswordReset('nobody@example.com')).toEqual({});
    const r = await auth.signUp(input);
    await auth.verifyEmail('ada@example.com', r.demoCode!);
    const { demoCode } = await auth.requestPasswordReset('ada@example.com');
    await auth.resetPassword('ada@example.com', demoCode!, 'New!Password2');
    await auth.signOut();
    await expect(auth.signIn('ada@example.com', 'New!Password2')).resolves.toBeTruthy();
  });
});
