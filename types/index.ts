import { Database as SupabaseDatabase } from './supabase';

// Supabaseの自動生成型からテーブルの型を抽出
export type Card = SupabaseDatabase['public']['Tables']['cards']['Row'];
export type Room = SupabaseDatabase['public']['Tables']['rooms']['Row'];