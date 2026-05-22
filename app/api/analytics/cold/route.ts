import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count } = await supabase
    .from('contact_activity')
    .select('*', { count: 'exact', head: true })

  if ((count || 0) === 0) {
    // contact_activity が空の場合、business_cards.last_contacted_at で 60日以上接触なしを暫定表示
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data: stale } = await supabase
      .from('business_cards')
      .select('id, full_name, name, company_name, email, last_contacted_at')
      .not('last_contacted_at', 'is', null)
      .lt('last_contacted_at', sixtyDaysAgo)
      .order('last_contacted_at', { ascending: true })
      .limit(50)

    const now = Date.now()
    const items = (stale || []).map((c) => {
      const lastMs = c.last_contacted_at ? new Date(c.last_contacted_at).getTime() : null
      const daysSince = lastMs ? Math.floor((now - lastMs) / (24 * 60 * 60 * 1000)) : null
      const severity: 'red' | 'yellow' | 'gray' =
        daysSince !== null && daysSince >= 180 ? 'red' : daysSince !== null && daysSince >= 90 ? 'yellow' : 'gray'
      return {
        id: c.id,
        contact_email: c.email || '',
        contact_name: c.full_name || c.name || '',
        company_name: c.company_name,
        last_message_at: c.last_contacted_at,
        message_count_30d: 0,
        message_count_90d: 0,
        message_count_365d: 0,
        days_since_last: daysSince,
        severity,
        business_card_id: c.id,
      }
    })

    return NextResponse.json({
      has_data: items.length > 0,
      fallback: 'last_contacted_at',
      items,
      summary: {
        red: items.filter(i => i.severity === 'red').length,
        yellow: items.filter(i => i.severity === 'yellow').length,
        gray: items.filter(i => i.severity === 'gray').length,
      },
    })
  }

  const { data: activities } = await supabase
    .from('contact_activity')
    .select('id, contact_email, company_name, message_count_30d, message_count_90d, message_count_365d, last_message_at, business_card_id')

  const now = Date.now()
  const D90 = 90 * 24 * 60 * 60 * 1000
  const D60 = 60 * 24 * 60 * 60 * 1000

  type Severity = 'red' | 'yellow' | 'gray'

  const items: Array<{
    id: string
    contact_email: string
    company_name: string | null
    last_message_at: string | null
    message_count_30d: number
    message_count_90d: number
    message_count_365d: number
    days_since_last: number | null
    severity: Severity
    business_card_id: string | null
  }> = []

  for (const a of activities || []) {
    const lastMs = a.last_message_at ? new Date(a.last_message_at).getTime() : null
    const daysSince = lastMs ? Math.floor((now - lastMs) / (24 * 60 * 60 * 1000)) : null
    const m365 = a.message_count_365d || 0
    const m90 = a.message_count_90d || 0
    const lastIsOld90 = lastMs !== null && (now - lastMs) > D90
    const lastIsOld60 = lastMs !== null && (now - lastMs) > D60

    let severity: Severity | null = null
    if (m365 >= 20 && lastIsOld90 && m90 === 0) severity = 'red'
    else if (m365 >= 5 && lastIsOld60 && m90 === 0) severity = 'yellow'
    else if (m365 > 0 && (m90 / m365) < 0.5) severity = 'gray'

    if (severity) {
      items.push({
        id: a.id,
        contact_email: a.contact_email,
        company_name: a.company_name,
        last_message_at: a.last_message_at,
        message_count_30d: a.message_count_30d || 0,
        message_count_90d: a.message_count_90d || 0,
        message_count_365d: m365,
        days_since_last: daysSince,
        severity,
        business_card_id: a.business_card_id,
      })
    }
  }

  // 重要度順ソート
  const order = { red: 0, yellow: 1, gray: 2 }
  items.sort((a, b) => order[a.severity] - order[b.severity] || (b.message_count_365d - a.message_count_365d))

  return NextResponse.json({
    has_data: true,
    items: items.slice(0, 200),
    summary: {
      red: items.filter(i => i.severity === 'red').length,
      yellow: items.filter(i => i.severity === 'yellow').length,
      gray: items.filter(i => i.severity === 'gray').length,
    },
  })
}
