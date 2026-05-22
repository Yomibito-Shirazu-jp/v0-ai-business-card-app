import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateObject } from 'ai'
import { z } from 'zod'

// 一括タグ自動生成 (Vercel AI Gateway 経由)
// 既存 tags が空 / 短い名刺について 業種/規模/地域/関係性 系のタグを推定する。
// 大量データを安全に処理するため、1リクエストで最大 N 件のみ処理する（呼び出し側がページング）。
const BATCH_SIZE = 25
const MAX_BATCH = 100

const schema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      tags: z.array(z.string()).max(6),
    })
  ),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const limit = Math.min(MAX_BATCH, Math.max(1, Number(body?.limit) || BATCH_SIZE))
  const onlyEmpty = body?.onlyEmpty !== false

  // 対象抽出
  let query = supabase
    .from('business_cards')
    .select('id, full_name, name, company_name, position, department, tags')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (onlyEmpty) {
    // tags が空配列 or null
    query = query.or('tags.is.null,tags.eq.{}')
  }

  const { data: cards, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cards || cards.length === 0) {
    return NextResponse.json({ processed: 0, updated: 0, remaining: 0 })
  }

  const items = cards.map((c) => ({
    id: c.id,
    name: c.full_name || c.name || '',
    company: c.company_name || '',
    position: c.position || '',
    department: c.department || '',
  }))

  // AI でタグ推定
  let aiResults: Array<{ id: string; tags: string[] }> = []
  try {
    const { object } = await generateObject({
      model: 'anthropic/claude-haiku-4-5',
      schema,
      system:
        '日本のビジネス名刺データを分類する。各レコードに対して、業種・規模・地域・関係性を表す日本語タグを最大6個生成する。空文字や英語は禁止。例: ["IT", "スタートアップ", "東京", "ベンダー"]',
      prompt: `以下の名刺リストの各 id について、tags 配列を返してください。\n${JSON.stringify(items)}`,
    })
    aiResults = object.results
  } catch (err) {
    return NextResponse.json(
      { error: 'AI 生成に失敗しました', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    )
  }

  // DB 反映（1件ずつ update）
  let updated = 0
  for (const r of aiResults) {
    const existing = cards.find((c) => c.id === r.id)
    if (!existing) continue
    const merged = Array.from(new Set([...(existing.tags || []), ...r.tags.filter(Boolean)])).slice(0, 10)
    const { error: upErr } = await supabase
      .from('business_cards')
      .update({ tags: merged, updated_at: new Date().toISOString() })
      .eq('id', r.id)
    if (!upErr) updated++
  }

  // 残件数
  const { count: remaining } = await supabase
    .from('business_cards')
    .select('*', { count: 'exact', head: true })
    .or('tags.is.null,tags.eq.{}')

  return NextResponse.json({
    processed: cards.length,
    updated,
    remaining: remaining || 0,
  })
}
