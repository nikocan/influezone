/**
 * Runtime configuration. Only public (anon) keys are read on the client.
 * When Supabase is not configured the app runs in DEMO mode with clearly
 * labelled local sample data stored in the browser.
 */
export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const dataMode: 'supabase' | 'demo' = isSupabaseConfigured ? 'supabase' : 'demo';
