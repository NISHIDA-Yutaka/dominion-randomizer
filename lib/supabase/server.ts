// --- FILE: lib/supabase/server.ts ---
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client WITHOUT realtime options
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);