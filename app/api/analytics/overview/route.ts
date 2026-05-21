import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 総名刺数
  const { count: totalCards } = await supabase
    .from('business_cards')
    .select('*', { count: 'exact', head: true })

  // 関連企業数（DISTINCT company_name）
  const { data: companyRows } = await supabase
    .from('business_cards')
    .select('company_name')
    .not('company_name', 'is', null)

  const uniqueCompanies = new Set(
    (companyRows || []).map((r: { company_name: string | null }) => r.company_name).filter(Boolean)
  ).size

  // アクティブ社員数
  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // 直近30日の接触社数（contact_activity）
  const { data: recentContacts } = await supabase
    .from('contact_activity')
    .select('contact_email')
    .gt('message_count_30d', 0)

  const recentContactCount = recentContacts?.length || 0

  // キーパーソン: contact_activity の message_count_90d 降順 TOP1
  const { data: topContact } = await supabase
    .from('contact_activity')
    .select('contact_email, message_count_90d, business_card_id, company_name')
    .order('message_count_90d', { ascending: false })
    .limit(1)
    .maybeSingle()

  let keyPerson: { name: string; company: string | null; score: number } | null = null
  if (topContact && topContact.business_card_id) {
    const { data: card } = await supabase
      .from('business_cards')
      .select('name, full_name, company_name')
      .eq('id', topContact.business_card_id)
      .maybeSingle()

    if (card) {
      keyPerson = {
        name: card.full_name || card.name || topContact.contact_email,
        company: card.company_name,
        score: topContact.message_count_90d || 0,
      }
    }
  }

  // 業種(タグ)分布 TOP10
  const { data: allCards } = await supabase
    .from('business_cards')
    .select('tags, company_name, created_at')

  const tagCount: Record<string, number> = {}
  const companyCount: Record<string, number> = {}
  const dailyCount: Record<string, number> = {}
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  for (const card of allCards || []) {
    for (const tag of card.tags || []) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }
    if (card.company_name) {
      companyCount[card.company_name] = (companyCount[card.company_name] || 0) + 1
    }
    if (card.created_at) {
      const created = new Date(card.created_at)
      if (created >= thirtyDaysAgo) {
        const day = created.toISOString().slice(0, 10)
        dailyCount[day] = (dailyCount[day] || 0) + 1
      }
    }
  }

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const topCompanies = Object.entries(companyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const dailyTimeline = Object.entries(dailyCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  // contact_activity の存在確認
  const { count: activityCount } = await supabase
    .from('contact_activity')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    kpi: {
      totalCards: totalCards || 0,
      uniqueCompanies,
      activeEmployees: activeEmployees || 0,
      recentContactCount,
      keyPerson,
    },
    topTags,
    topCompanies,
    dailyTimeline,
    hasContactActivity: (activityCount || 0) > 0,
  })
}
