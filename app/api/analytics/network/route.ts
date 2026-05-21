import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
]

function colorFor(key: string | null | undefined): string {
  if (!key) return '#64748b'
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'recent' // recent | all | favorites
  const minStrength = parseInt(searchParams.get('minStrength') || '0', 10)
  const tagFilter = searchParams.get('tag') || ''

  // 社員ノード
  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name, email, department, role, status')
    .eq('status', 'active')

  // 名刺取得（モードで絞り込み）
  let cardsQuery = supabase
    .from('business_cards')
    .select('id, name, full_name, company_name, position, tags, owner_employee_id, is_favorite, email')
    .limit(2000)

  if (mode === 'favorites') {
    cardsQuery = cardsQuery.eq('is_favorite', true)
  }
  if (tagFilter) {
    cardsQuery = cardsQuery.contains('tags', [tagFilter])
  }

  const { data: cards } = await cardsQuery

  // contact_activity（メール往来）
  const { data: activities } = await supabase
    .from('contact_activity')
    .select('business_card_id, employee_id, contact_email, message_count_90d, last_message_at')
    .gt('message_count_90d', 0)

  const hasActivity = (activities?.length || 0) > 0

  // 表示対象の名刺ID
  let visibleCardIds: Set<string>
  if (mode === 'recent' && hasActivity) {
    visibleCardIds = new Set(
      (activities || [])
        .filter(a => a.business_card_id && (a.message_count_90d || 0) >= minStrength)
        .map(a => a.business_card_id!)
    )
  } else {
    visibleCardIds = new Set((cards || []).map(c => c.id))
  }

  // ノード構築
  const nodes: Array<{
    id: string
    type: 'employee' | 'business_card'
    label: string
    size: number
    color: string
    meta: Record<string, unknown>
  }> = []

  for (const emp of employees || []) {
    nodes.push({
      id: `emp_${emp.id}`,
      type: 'employee',
      label: emp.display_name || emp.email,
      size: 36,
      color: '#1e293b',
      meta: {
        department: emp.department,
        role: emp.role,
        email: emp.email,
      },
    })
  }

  const cardMap = new Map((cards || []).map(c => [c.id, c]))
  const activityByCard = new Map<string, number>()
  for (const a of activities || []) {
    if (a.business_card_id) {
      activityByCard.set(a.business_card_id, a.message_count_90d || 0)
    }
  }

  for (const card of cards || []) {
    if (!visibleCardIds.has(card.id)) continue
    const score = activityByCard.get(card.id) || 0
    const size = score > 0
      ? Math.min(32, Math.max(12, 12 + Math.log2(score + 1) * 4))
      : 14
    const firstTag = card.tags?.[0] || null
    nodes.push({
      id: `card_${card.id}`,
      type: 'business_card',
      label: card.full_name || card.name || '(無名)',
      size,
      color: colorFor(firstTag),
      meta: {
        company: card.company_name,
        position: card.position,
        tags: card.tags || [],
        score,
        isFavorite: card.is_favorite,
      },
    })
  }

  // リンク構築
  const links: Array<{
    source: string
    target: string
    type: 'owner' | 'company' | 'email'
    strength: number
  }> = []

  // owner_employee_id リンク
  for (const card of cards || []) {
    if (!visibleCardIds.has(card.id)) continue
    if (card.owner_employee_id) {
      links.push({
        source: `emp_${card.owner_employee_id}`,
        target: `card_${card.id}`,
        type: 'owner',
        strength: 1,
      })
    }
  }

  // メール往来リンク
  for (const a of activities || []) {
    if (!a.business_card_id || !a.employee_id) continue
    if (!visibleCardIds.has(a.business_card_id)) continue
    if ((a.message_count_90d || 0) < minStrength) continue
    links.push({
      source: `emp_${a.employee_id}`,
      target: `card_${a.business_card_id}`,
      type: 'email',
      strength: a.message_count_90d || 1,
    })
  }

  // 同社（company_name 一致）リンク
  const companyToCards = new Map<string, string[]>()
  for (const card of cards || []) {
    if (!visibleCardIds.has(card.id) || !card.company_name) continue
    const arr = companyToCards.get(card.company_name) || []
    arr.push(card.id)
    companyToCards.set(card.company_name, arr)
  }
  for (const [, ids] of companyToCards) {
    if (ids.length < 2 || ids.length > 10) continue // 巨大企業は描画スパムになるのでスキップ
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        links.push({
          source: `card_${ids[i]}`,
          target: `card_${ids[j]}`,
          type: 'company',
          strength: 1,
        })
      }
    }
  }

  // キーパーソン
  let keyPerson: { id: string; label: string; score: number } | null = null
  const cardNodes = nodes.filter(n => n.type === 'business_card')
  if (cardNodes.length > 0) {
    const top = cardNodes.reduce((a, b) =>
      ((a.meta.score as number) || 0) > ((b.meta.score as number) || 0) ? a : b
    )
    if ((top.meta.score as number) > 0) {
      keyPerson = { id: top.id, label: top.label, score: top.meta.score as number }
    }
  }

  // 利用可能タグ一覧
  const tagSet = new Set<string>()
  for (const card of cards || []) {
    for (const t of card.tags || []) tagSet.add(t)
  }

  return NextResponse.json({
    nodes,
    links,
    stats: {
      nodes_total: (employees?.length || 0) + (cards?.length || 0),
      nodes_visible: nodes.length,
      links_visible: links.length,
      key_person: keyPerson,
      has_contact_activity: hasActivity,
      mode,
    },
    available_tags: Array.from(tagSet).sort(),
  })
}
