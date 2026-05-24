import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/tags/merge
// body: { sources: string[], target: string }
//   sources 内のタグを target に置き換える(target が無ければ追加、重複は dedupe)
const PAGE_SIZE = 1000

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sources: string[] = Array.isArray(body?.sources) ? body.sources.filter((x: unknown) => typeof x === 'string' && x.length > 0) : []
  const target: string = typeof body?.target === 'string' ? body.target.trim() : ''
  if (sources.length < 1 || !target) {
    return NextResponse.json({ success: false, error: 'sources / target が不正です' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees').select('id, company_id, role, status')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp || !['owner', 'admin'].includes(emp.role)) {
    return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
  }

  const setSources = new Set(sources)

  const targets: { id: string; tags: string[] }[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('business_cards')
      .select('id, tags')
      .overlaps('tags', sources)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) break
    targets.push(...data.map((d: any) => ({ id: d.id, tags: d.tags || [] })))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  let updated = 0
  for (const card of targets) {
    const next = Array.from(new Set(card.tags.map((t) => (setSources.has(t) ? target : t))))
    const { error } = await supabase
      .from('business_cards')
      .update({ tags: next })
      .eq('id', card.id)
    if (!error) updated++
  }

  return NextResponse.json({ success: true, updated, target_count: targets.length })
}
