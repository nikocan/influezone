export type AppErrorCode =
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'rate_limited'
  | 'username_taken'
  | 'invalid_username'
  | 'invalid_url'
  | 'email_taken'
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'weak_password'
  | 'not_configured'
  | 'network'
  | 'payout_not_eligible'
  | 'not_eligible'
  | 'campaign_not_open'
  | 'already_applied'
  | 'disclosure_mismatch'
  | 'not_participant'
  | 'invalid_transition'
  | 'slug_taken'
  | 'payout_open'
  | 'insufficient_funds'
  | 'payout_execution_disabled'
  | 'unknown';

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export function errorCode(e: unknown): AppErrorCode {
  if (e instanceof AppError) return e.code;
  if (e instanceof TypeError && /fetch|network/i.test(e.message)) return 'network';
  return 'unknown';
}
