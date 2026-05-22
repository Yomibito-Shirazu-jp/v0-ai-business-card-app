import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 全件集計の上限（Supabase Postgrest の Range 上限を超えないために段階取得する）
const PAGE_SIZE = 1000

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1) KPI: count(exact) で正確な総数を取得
  const [
    { count: totalCards },
    { count: favoriteCards },
    { count: thisMonthCards },
    { count: companyTableCount },
  ] = await Promise.all([
    supabase.from('business_cards').select('*', { count: 'exact', head: true }),
    supabase.from('business_cards').select('*', { count: 'exact', head: true }).eq('is_favorite', true),
    supabase
      .from('business_cards')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
  ])

  // 2) 全件ページング取得（業種/会社/月次集計用）
  const total = totalCards || 0
  const allCards: Array<{
    company_name: string | null
    tags: string[] | null
    created_at: string | null
    last_contacted_at: string | null
  }> = []

  for (let from = 0; from < total; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, total - 1)
    const { data, error } = await supabase
      .from('business_cards')
      .select('company_name, tags, created_at, last_contacted_at')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error || !data) break
    allCards.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  const tagCount = new Map<string, number>()
  const companyCount = new Map<string, number>()
  const dailyCount = new Map<string, number>()
  const monthlyCount = new Map<string, number>()
  const uniqueCompanies = new Set<string>()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  for (const card of allCards) {
    if (Array.isArray(card.tags)) {
      for (const tag of card.tags) {
        if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
      }
    }
    if (card.company_name) {
      uniqueCompanies.add(card.company_name)
      companyCount.set(card.company_name, (companyCount.get(card.company_name) || 0) + 1)
    }
    if (card.created_at) {
      const created = new Date(card.created_at)
      if (created >= thirtyDaysAgo) {
        const day = created.toISOString().slice(0, 10)
        dailyCount.set(day, (dailyCount.get(day) || 0) + 1)
      }
      if (created >= twelveMonthsAgo) {
        const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
        monthlyCount.set(month, (monthlyCount.get(month) || 0) + 1)
      }
    }
  }

  // 3) アクティブ社員数 / contact_activity の有無
  const [{ count: activeEmployees }, { count: activityCount }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contact_activity').select('*', { count: 'exact', head: true }),
  ])

  // 4) 直近30日 / キーパーソン（contact_activity が空でも安全に動く）
  let recentContactCount = 0
  let keyPerson: { name: string; company: string | null; score: number } | null = null
  if ((activityCount || 0) > 0) {
    const { data: recent } = await supabase
      .from('contact_activity')
      .select('contact_email')
      .gt('message_count_30d', 0)
    recentContactCount = recent?.length || 0

    const { data: top } = await supabase
      .from('contact_activity')
      .select('contact_email, message_count_90d, business_card_id, company_name')
      .order('message_count_90d', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (top?.business_card_id) {
      const { data: card } = await supabase
        .from('business_cards')
        .select('name, full_name, company_name')
        .eq('id', top.business_card_id)
        .maybeSingle()
      if (card) {
        keyPerson = {
          name: card.full_name || card.name || top.contact_email,
          company: card.company_name,
          score: top.message_count_90d || 0,
        }
      }
    }
  }

  // 出力整形
  const topTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const topCompanies = Array.from(companyCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // 直近30日の日次（欠損日を 0 で埋める）
  const dailyTimeline: Array<{ date: string; count: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailyTimeline.push({ date: key, count: dailyCount.get(key) || 0 })
  }

  // 直近12ヶ月の月次
  const monthlyTimeline: Array<{ month: string; count: number }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyTimeline.push({ month: key, count: monthlyCount.get(key) || 0 })
  }

  return NextResponse.json({
    kpi: {
      totalCards: totalCards || 0,
      favoriteCards: favoriteCards || 0,
      thisMonthCards: thisMonthCards || 0,
      // 「会社数」は companies テーブルの行数があればそれを使い、無ければ business_cards 由来の DISTINCT で代替
      uniqueCompanies: companyTableCount && companyTableCount > 0 ? companyTableCount : uniqueCompanies.size,
      activeEmployees: activeEmployees || 0,
      recentContactCount,
      keyPerson,
    },
    topTags,
    topCompanies,
    dailyTimeline,
    monthlyTimeline,
    hasContactActivity: (activityCount || 0) > 0,
  })
}
