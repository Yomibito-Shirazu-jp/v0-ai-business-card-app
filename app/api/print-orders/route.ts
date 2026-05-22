import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// GET: 自社の印刷注文一覧
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return NextResponse.json({ items: [] })

  const { data, error } = await supabase
    .from('print_orders')
    .select(`
      id, status, paper_type, finish, notes, shipping_address,
      ordered_at, confirmed_at, production_started_at, shipped_at, delivered_at,
      tracking_number, total_cost, created_at,
      print_order_items ( id, design_id, employee_id, quantity, unit_price, subtotal )
    `)
    .eq('company_id', emp.company_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

// POST: 印刷注文を作成
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const body = await request.json()
  const { paper_type, finish, notes, shipping_address, items } = body as {
    paper_type?: string
    finish?: string
    notes?: string
    shipping_address?: string
    items?: Array<{ design_id?: string; employee_id?: string; quantity: number; unit_price: number }>
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 })
  }
  for (const it of items) {
    if (!it.quantity || it.quantity <= 0) return NextResponse.json({ error: "invalid quantity" }, { status: 400 })
    if (it.unit_price == null || it.unit_price < 0) return NextResponse.json({ error: "invalid unit_price" }, { status: 400 })
  }

  const total_cost = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)

  const { data: order, error: orderErr } = await supabase
    .from('print_orders')
    .insert({
      company_id: emp.company_id,
      ordered_by: emp.id,
      status: 'pending',
      paper_type: paper_type || 'standard',
      finish: finish || 'matte',
      notes: notes || null,
      shipping_address: shipping_address || null,
      ordered_at: new Date().toISOString(),
      total_cost,
    })
    .select()
    .single()

  if (orderErr || !order) return NextResponse.json({ error: orderErr?.message || 'order failed' }, { status: 500 })

  const itemsPayload = items.map((it) => ({
    order_id: order.id,
    design_id: it.design_id || null,
    employee_id: it.employee_id || emp.id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    subtotal: it.quantity * it.unit_price,
  }))

  const { error: itemsErr } = await supabase.from('print_order_items').insert(itemsPayload)
  if (itemsErr) {
    // 失敗時はオーダーを削除（簡易ロールバック）
    await supabase.from('print_orders').delete().eq('id', order.id)
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, order_id: order.id })
}
