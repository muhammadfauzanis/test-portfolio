import { createClient } from '@supabase/supabase-js';

// Optional: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to store
// comments in Supabase (table "comments": id, name, comment, avatar_url, created_at).
// Without them the comment section falls back to localStorage.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
