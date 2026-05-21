import { Database } from './database.types'

export type BusinessCard = Database['public']['Tables']['business_cards']['Row']
export type BusinessCardInsert = Database['public']['Tables']['business_cards']['Insert']
export type BusinessCardUpdate = Database['public']['Tables']['business_cards']['Update']

// OCR解析結果の型
export interface OCRResult {
  full_name?: string
  full_name_kana?: string
  company_name?: string
  company_name_kana?: string
  department?: string
  position?: string
  email?: string
  phone?: string
  mobile?: string
  fax?: string
  postal_code?: string
  address?: string
  website?: string
  linkedin?: string
  twitter?: string
  facebook?: string
  raw_text: string
  confidence: number
}

// API レスポンス型
export interface SaveBusinessCardResponse {
  success: boolean
  data?: BusinessCard
  error?: string
}
