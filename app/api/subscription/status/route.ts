import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 名刺サブスク状態
// プラン: 1,950 円/月 で 50 枚/月
// active: 直近 30 日以内 / grace: 30-60 日 / suspended: 60 日超 / new: 発注なし
const PLAN = { name: 'スタンダード', monthly_price_jpy: 1950, monthly_cards: 50 }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp) return NextResponse.json({ error: 'No employee' }, { status: 403 })

  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  const { data: orders } = await supabase
    .from('print_orders')
    .select('id, status, created_at, ordered_at, total_cost, print_order_items(quantity)')
    .eq('company_id', emp.company_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const all = orders || []
  const now = Date.now()
  const quantityOf = (o: any) => (o.print_order_items || []).reduce((a: number, b: any) => a + (b.quantity || 0), 0)
  const ordersWithQty = all.map(o => ({
    id: o.id, status: o.status, created_at: o.created_at, ordered_at: o.ordered_at,
    total_cost: o.total_cost, quantity: quantityOf(o),
  }))
  const last = ordersWithQty[0] || null
  const daysSinceLast = last ? Math.floor((now - new Date(last.created_at).getTime()) / 86400000) : null

  let status: 'active' | 'grace' | 'suspended' | 'new' = 'new'
  if (daysSinceLast === null) status = 'new'
  else if (daysSinceLast <= 30) status = 'active'
  else if (daysSinceLast <= 60) status = 'grace'
  else status = 'suspended'

  const totals = { d30: 0, d90: 0, d365: 0 }
  for (const o of ordersWithQty) {
    const d = (now - new Date(o.created_at).getTime()) / 86400000
    if (d <= 30) totals.d30 += o.quantity
    if (d <= 90) totals.d90 += o.quantity
    totals.d365 += o.quantity
  }
  const nextRecommendedAt = last
    ? new Date(new Date(last.created_at).getTime() + 30 * 86400000).toISOString()
    : null
  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', emp.company_id)
    .eq('status', 'active')

  return NextResponse.json({
    plan: PLAN, status, last_order: last,
    days_since_last: daysSinceLast,
    next_recommended_at: nextRecommendedAt,
    totals, active_employees: activeEmployees || 0,
    history: ordersWithQty.slice(0, 5),
  })
}
