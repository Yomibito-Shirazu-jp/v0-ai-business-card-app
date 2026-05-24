import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// タグ名指定の操作: PATCH (rename), DELETE (remove from all cards)
const PAGE_SIZE = 1000

async function ensureAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 }) }
  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, role, status')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single()
  if (!emp || !['owner', 'admin'].includes(emp.role)) {
    return { error: NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 }) }
  }
  return { supabase, emp }
}

// PATCH /api/tags/{name}  body: { new_name: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const oldName = decodeURIComponent(name)
  const body = await req.json().catch(() => ({}))
  const newName = typeof body?.new_name === 'string' ? body.new_name.trim() : ''

  if (!oldName || !newName) {
    return NextResponse.json({ success: false, error: 'タグ名が不正です' }, { status: 400 })
  }
  if (oldName === newName) {
    return NextResponse.json({ success: true, updated: 0, message: '変更なし' })
  }

  const guard = await ensureAdmin()
  if ('error' in guard) return guard.error
  const { supabase } = guard

  // 対象カードを取得 (Postgres array_contains)
  const targets: { id: string; tags: string[] }[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('business_cards')
      .select('id, tags')
      .contains('tags', [oldName])
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) break
    targets.push(...data.map((d: any) => ({ id: d.id, tags: d.tags || [] })))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  let updated = 0
  for (const card of targets) {
    const next = Array.from(new Set(card.tags.map((t) => (t === oldName ? newName : t))))
    const { error } = await supabase
      .from('business_cards')
      .update({ tags: next })
      .eq('id', card.id)
    if (!error) updated++
  }

  return NextResponse.json({ success: true, updated, target_count: targets.length })
}

// DELETE /api/tags/{name}  → 全カードからこのタグを除去
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const target = decodeURIComponent(name)
  if (!target) {
    return NextResponse.json({ success: false, error: 'タグ名が不正です' }, { status: 400 })
  }

  const guard = await ensureAdmin()
  if ('error' in guard) return guard.error
  const { supabase } = guard

  const targets: { id: string; tags: string[] }[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('business_cards')
      .select('id, tags')
      .contains('tags', [target])
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) break
    targets.push(...data.map((d: any) => ({ id: d.id, tags: d.tags || [] })))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  let updated = 0
  for (const card of targets) {
    const next = card.tags.filter((t) => t !== target)
    const { error } = await supabase
      .from('business_cards')
      .update({ tags: next })
      .eq('id', card.id)
    if (!error) updated++
  }

  return NextResponse.json({ success: true, removed_from: updated })
}
