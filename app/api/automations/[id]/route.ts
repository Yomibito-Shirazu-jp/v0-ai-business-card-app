import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function getEmployee() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) }
  const { data: emp } = await supabase
    .from('employees').select('id, company_id, role')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp) return { error: NextResponse.json({ error: '社員登録がありません' }, { status: 403 }) }
  return { supabase, emp }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await getEmployee()
  if ('error' in g) return g.error
  const { supabase, emp } = g

  // Verify the automation belongs to the user's company
  const { data: automation } = await supabase
    .from('automations')
    .select('company_id')
    .eq('id', id)
    .single()
  
  if (!automation || automation.company_id !== emp.company_id) {
    return NextResponse.json({ error: '自動化が見つかりません' }, { status: 404 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['name', 'description', 'trigger_type', 'action_type', 'config', 'status']) {
    if (body[k] !== undefined) update[k] = body[k]
  }
  const { data, error } = await supabase
    .from('automations')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await getEmployee()
  if ('error' in g) return g.error
  const { supabase, emp } = g

  // Verify the automation belongs to the user's company
  const { data: automation } = await supabase
    .from('automations')
    .select('company_id')
    .eq('id', id)
    .single()
  
  if (!automation || automation.company_id !== emp.company_id) {
    return NextResponse.json({ error: '自動化が見つかりません' }, { status: 404 })
  }

  const { error } = await supabase.from('automations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
