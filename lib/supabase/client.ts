// --- FILE: lib/supabase/client.ts ---
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side client with realtime options
export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    }
);