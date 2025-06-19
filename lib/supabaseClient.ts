import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // supabaseの型定義、後ほど作成

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// `Database` ジェネリクスで型付けされたクライアントを作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);