import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // contact_activity が空かチェック
  const { count } = await supabase
    .from('contact_activity')
    .select('*', { count: 'exact', head: true })

  if ((count || 0) === 0) {
    return NextResponse.json({
      has_data: false,
      top_companies: [],
      employee_breakdown: [],
      monthly_trend: [],
    })
  }

  // 企業別ランキング (v_company_contact_summary ビュー)
  const { data: companySummary } = await supabase
    .from('v_company_contact_summary')
    .select('*')
    .order('msgs_90d', { ascending: false })
    .limit(20)

  // 担当社員内訳
  const { data: activities } = await supabase
    .from('contact_activity')
    .select('employee_id, message_count_90d, message_count_30d')

  const employeeMap = new Map<string, { msgs_30d: number; msgs_90d: number }>()
  for (const a of activities || []) {
    if (!a.employee_id) continue
    const cur = employeeMap.get(a.employee_id) || { msgs_30d: 0, msgs_90d: 0 }
    cur.msgs_30d += a.message_count_30d || 0
    cur.msgs_90d += a.message_count_90d || 0
    employeeMap.set(a.employee_id, cur)
  }

  const employeeIds = Array.from(employeeMap.keys())
  const { data: employees } = employeeIds.length > 0
    ? await supabase
        .from('employees')
        .select('id, display_name, email')
        .in('id', employeeIds)
    : { data: [] }

  const employeeBreakdown = (employees || []).map(emp => ({
    id: emp.id,
    name: emp.display_name || emp.email,
    msgs_30d: employeeMap.get(emp.id)?.msgs_30d || 0,
    msgs_90d: employeeMap.get(emp.id)?.msgs_90d || 0,
  })).sort((a, b) => b.msgs_90d - a.msgs_90d)

  return NextResponse.json({
    has_data: true,
    top_companies: companySummary || [],
    employee_breakdown: employeeBreakdown,
  })
}
