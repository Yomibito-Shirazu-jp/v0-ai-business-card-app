import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 1000

// タグ集計（KPI + 既存タグ一覧）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count: total } = await supabase
    .from('business_cards')
    .select('*', { count: 'exact', head: true })

  const totalCards = total || 0
  const tagged = new Map<string, number>()
  let taggedCount = 0
  let lastUpdatedAt: string | null = null

  for (let from = 0; from < totalCards; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, totalCards - 1)
    const { data, error } = await supabase
      .from('business_cards')
      .select('tags, updated_at')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error || !data) break
    for (const row of data) {
      if (Array.isArray(row.tags) && row.tags.length > 0) {
        taggedCount++
        for (const t of row.tags) {
          if (t) tagged.set(t, (tagged.get(t) || 0) + 1)
        }
      }
      if (row.updated_at && (!lastUpdatedAt || row.updated_at > lastUpdatedAt)) {
        lastUpdatedAt = row.updated_at
      }
    }
    if (data.length < PAGE_SIZE) break
  }

  const tags = Array.from(tagged.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    kpi: {
      totalTags: tags.length,
      taggedCards: taggedCount,
      untaggedCards: Math.max(0, totalCards - taggedCount),
      lastUpdatedAt,
    },
    tags,
  })
}
