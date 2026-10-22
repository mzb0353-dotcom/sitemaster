import { createClient } from '@supabase/supabase-js';

// ה-publishable key מיועד להיות גלוי בדפדפן; ההגנה על הנתונים היא ה-RLS בשרת.
// אפשר לדרוס את הערכים דרך .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_KEY).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jjkpogveffswvrmxthqc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_leKu0E7UYLcBdpjvIIekmA_-Og2rie2';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
