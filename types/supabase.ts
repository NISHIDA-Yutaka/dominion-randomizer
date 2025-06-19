export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string
          name: string
          expansion: string
          type: string[]
          cost: number
          tags: string[] | null
          image: string | null
        }
        Insert: {
          id?: string
          name: string
          expansion?: string
          type: string[]
          cost: number
          tags?: string[] | null
          image?: string | null
        }
        Update: {
          id?: string
          name?: string
          expansion?: string
          type?: string[]
          cost?: number
          tags?: string[] | null
          image?: string | null
        }
      }
      rooms: {
        Row: {
          id: string
          cards: Json
          created_at: string
        }
        Insert: {
          id?: string
          cards: Json
          created_at?: string
        }
        Update: {
          id?: string
          cards?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}