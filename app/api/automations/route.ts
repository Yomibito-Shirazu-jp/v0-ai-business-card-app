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

export async function GET() {
  const g = await getEmployee()
  if ('error' in g) return g.error
  const { supabase, emp } = g
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('company_id', emp.company_id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const g = await getEmployee()
  if ('error' in g) return g.error
  const { supabase, emp } = g
  const body = await req.json()
  const { data, error } = await supabase
    .from('automations')
    .insert({
      company_id: emp.company_id,
      employee_id: emp.id,
      name: body.name || '新しい自動化',
      description: body.description || null,
      trigger_type: body.trigger_type || 'manual',
      action_type: body.action_type || 'custom',
      config: body.config || {},
      status: body.status || 'draft',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
