import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 会社全体の発注 + 決済一覧 (owner/admin 限定)
// 自社員以外の操作はできない (RLS)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees').select('id, company_id, role')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp) return NextResponse.json({ error: '社員登録がありません' }, { status: 403 })
  if (!['owner', 'admin'].includes(emp.role)) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  // 発注一覧 (アイテム + 注文者 employee)
  const { data: orders, error } = await supabase
    .from('print_orders')
    .select(`
      id, status, paper_type, finish, notes, shipping_address,
      ordered_at, confirmed_at, production_started_at, shipped_at, delivered_at,
      tracking_number, total_cost, created_at, ordered_by,
      print_order_items ( id, design_id, employee_id, quantity, unit_price, subtotal )
    `)
    .eq('company_id', emp.company_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 注文者の社員情報
  const employeeIds = Array.from(new Set((orders || []).map((o: any) => o.ordered_by).filter(Boolean) as string[]))
  const { data: employees } = employeeIds.length > 0
    ? await supabase.from('employees').select('id, display_name, email').in('id', employeeIds)
    : { data: [] }
  const empMap = new Map((employees || []).map(e => [e.id, e]))

  // 各発注に紐付く payments
  const orderIds = (orders || []).map((o: any) => o.id)
  const { data: payments } = orderIds.length > 0
    ? await supabase
        .from('payments')
        .select('id, order_id, amount, currency, tax_amount, status, payment_method, card_brand, card_last4, provider, receipt_url, paid_at, refunded_at, created_at, failure_reason')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
    : { data: [] }
  const payByOrder = new Map<string, any[]>()
  for (const p of payments || []) {
    const arr = payByOrder.get(p.order_id) || []
    arr.push(p)
    payByOrder.set(p.order_id, arr)
  }

  // KPI
  const now = Date.now()
  let totalAmount = 0
  let paidAmount = 0
  let unpaidAmount = 0
  let totalQuantity = 0
  let last30dCount = 0
  let last30dAmount = 0
  const enriched = (orders || []).map((o: any) => {
    const qty = (o.print_order_items || []).reduce((a: number, b: any) => a + (b.quantity || 0), 0)
    const pays = payByOrder.get(o.id) || []
    const succeeded = pays.filter(p => p.status === 'succeeded')
    const refunded = pays.filter(p => p.status === 'refunded' || p.status === 'partially_refunded')
    const succeededAmount = succeeded.reduce((a, b) => a + Number(b.amount || 0), 0)
    const refundedAmount = refunded.reduce((a, b) => a + Number(b.amount || 0), 0)
    const orderTotal = Number(o.total_cost || 0)
    totalAmount += orderTotal
    paidAmount += succeededAmount - refundedAmount
    unpaidAmount += Math.max(0, orderTotal - succeededAmount + refundedAmount)
    totalQuantity += qty
    const created = new Date(o.created_at).getTime()
    if (now - created <= 30 * 86400000) {
      last30dCount++
      last30dAmount += orderTotal
    }
    return {
      ...o,
      quantity: qty,
      orderer: empMap.get(o.ordered_by) || null,
      payments: pays,
      payment_summary: {
        succeeded_amount: succeededAmount,
        refunded_amount: refundedAmount,
        balance_due: Math.max(0, orderTotal - succeededAmount + refundedAmount),
        latest_status: pays[0]?.status || 'pending',
      },
    }
  })

  return NextResponse.json({
    items: enriched,
    kpi: {
      total_orders: enriched.length,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      unpaid_amount: unpaidAmount,
      last30d_count: last30dCount,
      last30d_amount: last30dAmount,
    },
  })
}
