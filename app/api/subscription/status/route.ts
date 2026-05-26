import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 名刺サブスク (月次お届け)
// 毎月 delivery_day_of_month に 50 枚自動発送 + ¥1,950 自動課金
const PLAN = { name: 'スタンダード', monthly_price_jpy: 1950, monthly_cards: 50 }
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function computeNextDelivery(dayOfMonth: number, from: Date = new Date()): Date {
  const year = from.getFullYear()
  const month = from.getMonth()
  const candidate = new Date(year, month, dayOfMonth, 9, 0, 0)
  if (candidate <= from) {
    candidate.setMonth(month + 1)
  }
  return candidate
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp) return NextResponse.json({ error: 'No employee' }, { status: 403 })

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, delivery_day_of_month, subscription_active, subscription_started_at')
    .eq('id', emp.company_id)
    .single()

  const dayOfMonth = company?.delivery_day_of_month || null
  const active = !!(company?.subscription_active && dayOfMonth)

  // 次回お届け日
  let nextDeliveryAt: string | null = null
  let daysUntilNext: number | null = null
  if (active && dayOfMonth) {
    const next = computeNextDelivery(dayOfMonth)
    nextDeliveryAt = next.toISOString()
    daysUntilNext = Math.ceil((next.getTime() - Date.now()) / ONE_DAY_MS)
  }

  // 過去 12 ヶ月のお届け履歴 (print_orders から)
  const since = new Date(Date.now() - 12 * 30 * ONE_DAY_MS).toISOString()
  const { data: orders } = await supabase
    .from('print_orders')
    .select('id, status, created_at, ordered_at, shipped_at, delivered_at, tracking_number, total_cost, print_order_items(quantity)')
    .eq('company_id', emp.company_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(12)

  const quantityOf = (o: any) => (o.print_order_items || []).reduce((a: number, b: any) => a + (b.quantity || 0), 0)
  const history = (orders || []).map(o => ({
    id: o.id,
    status: o.status,
    created_at: o.created_at,
    ordered_at: o.ordered_at,
    shipped_at: o.shipped_at,
    delivered_at: o.delivered_at,
    tracking_number: o.tracking_number,
    total_cost: o.total_cost,
    quantity: quantityOf(o),
  }))

  // 年間サマリ
  const yearlyQuantity = history.reduce((a, b) => a + b.quantity, 0)
  const yearlyAmount = history.reduce((a, b) => a + Number(b.total_cost || 0), 0)

  // 社員数
  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', emp.company_id)
    .eq('status', 'active')

  return NextResponse.json({
    plan: PLAN,
    active,
    delivery_day_of_month: dayOfMonth,
    subscription_started_at: company?.subscription_started_at || null,
    next_delivery_at: nextDeliveryAt,
    days_until_next: daysUntilNext,
    history,
    yearly: { quantity: yearlyQuantity, amount: yearlyAmount, deliveries: history.length },
    active_employees: activeEmployees || 0,
  })
}
