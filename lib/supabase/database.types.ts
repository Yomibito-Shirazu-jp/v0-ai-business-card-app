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
      business_cards: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          full_name_kana: string | null
          company_name: string | null
          company_name_kana: string | null
          department: string | null
          position: string | null
          email: string | null
          phone: string | null
          mobile: string | null
          fax: string | null
          postal_code: string | null
          address: string | null
          website: string | null
          linkedin: string | null
          twitter: string | null
          facebook: string | null
          ocr_raw_text: string | null
          ocr_confidence: number | null
          image_url: string | null
          tags: string[] | null
          notes: string | null
          is_favorite: boolean
          relationship_type: string | null
          relationship_strength: number
          scanned_at: string
          last_contacted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          full_name_kana?: string | null
          company_name?: string | null
          company_name_kana?: string | null
          department?: string | null
          position?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          fax?: string | null
          postal_code?: string | null
          address?: string | null
          website?: string | null
          linkedin?: string | null
          twitter?: string | null
          facebook?: string | null
          ocr_raw_text?: string | null
          ocr_confidence?: number | null
          image_url?: string | null
          tags?: string[] | null
          notes?: string | null
          is_favorite?: boolean
          relationship_type?: string | null
          relationship_strength?: number
          scanned_at?: string
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          full_name_kana?: string | null
          company_name?: string | null
          company_name_kana?: string | null
          department?: string | null
          position?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          fax?: string | null
          postal_code?: string | null
          address?: string | null
          website?: string | null
          linkedin?: string | null
          twitter?: string | null
          facebook?: string | null
          ocr_raw_text?: string | null
          ocr_confidence?: number | null
          image_url?: string | null
          tags?: string[] | null
          notes?: string | null
          is_favorite?: boolean
          relationship_type?: string | null
          relationship_strength?: number
          scanned_at?: string
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
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
  }
}
