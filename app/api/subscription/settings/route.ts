import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// owner/admin がお届け日を変更
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees').select('id, company_id, role')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp || !['owner', 'admin'].includes(emp.role)) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (body.delivery_day_of_month !== undefined) {
    const d = Number(body.delivery_day_of_month)
    if (!Number.isInteger(d) || d < 1 || d > 28) {
      return NextResponse.json({ error: 'お届け日は 1〜28 で指定してください' }, { status: 400 })
    }
    update.delivery_day_of_month = d
  }
  if (typeof body.subscription_active === 'boolean') {
    update.subscription_active = body.subscription_active
    update.subscription_paused_at = body.subscription_active ? null : new Date().toISOString()
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '更新項目がありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', emp.company_id)
    .select('id, delivery_day_of_month, subscription_active')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, company: data })
}
