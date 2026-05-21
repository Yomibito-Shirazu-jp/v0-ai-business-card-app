import type { OCRResult } from '@/lib/supabase/types'

// 名刺画像からテキストを抽出してパースする
export async function parseBusinessCard(imageBase64: string): Promise<OCRResult> {
  // 実際のOCR処理はGoogle Cloud Vision API等を使用
  // ここではAI SDKを使用してOCR + パースを行う
  
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  })

  if (!response.ok) {
    throw new Error('OCR処理に失敗しました')
  }

  return response.json()
}

// OCR結果をDBに保存
export async function saveBusinessCard(
  ocrResult: OCRResult,
  imageUrl?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const response = await fetch('/api/business-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ocrResult, imageUrl }),
  })

  return response.json()
}

// 名刺一覧を取得
export async function fetchBusinessCards(params?: {
  search?: string
  tag?: string
  limit?: number
  offset?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.tag) searchParams.set('tag', params.tag)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const response = await fetch(`/api/business-cards?${searchParams.toString()}`)
  return response.json()
}

// 名刺を更新
export async function updateBusinessCard(
  id: string,
  updates: Record<string, unknown>
) {
  const response = await fetch(`/api/business-cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return response.json()
}

// 名刺を削除
export async function deleteBusinessCard(id: string) {
  const response = await fetch(`/api/business-cards/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}
