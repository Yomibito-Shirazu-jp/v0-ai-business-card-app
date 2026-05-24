import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Gmail メタデータを過去 90 日読んで contact_activity を更新する
// 注意: タイトル/本文は保存しない。送信/受信日と相手アドレスのみ。
export async function POST() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: '認証が必要です' }, { status: 401 })
  }
  if (!session.provider_token) {
    return NextResponse.json({
      ok: false,
      error: 'Google OAuth トークンがありません。設定 → Google Workspace 連携で再認証してください。',
      code: 'NO_GOOGLE_TOKEN',
    }, { status: 412 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, email')
    .eq('auth_user_id', session.user.id).eq('status', 'active').single()
  if (!emp) {
    return NextResponse.json({ ok: false, error: '社員登録がありません' }, { status: 403 })
  }

  const SINCE_DAYS = 90
  const sinceMs = Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000
  const sinceSec = Math.floor(sinceMs / 1000)

  // 過去 90 日の messages を ID 一覧で取得 (max 500)
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
  const q = `after:${Math.floor(sinceMs / 1000)}`
  const ids: string[] = []
  let pageToken: string | undefined
  let pages = 0
  while (pages < 5) {
    const url = `${baseUrl}?q=${encodeURIComponent(q)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.provider_token}` } })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Gmail list 失敗 (${res.status})` }, { status: 502 })
    }
    const data = await res.json() as any
    for (const m of data?.messages ?? []) if (m.id) ids.push(m.id)
    pageToken = data?.nextPageToken
    if (!pageToken) break
    pages++
  }

  // 各メッセージの metadata (From/To/Date) を fetch
  // From/To のメールアドレスを抜いて business_cards.email との突合に使う
  // 全部直列だと遅いので 8 並列
  const counts = new Map<string, { last: number; m30: number; m90: number; m365: number }>()
  const D30 = Date.now() - 30 * 24 * 60 * 60 * 1000
  const D90 = Date.now() - 90 * 24 * 60 * 60 * 1000
  const D365 = Date.now() - 365 * 24 * 60 * 60 * 1000

  function bump(email: string, when: number) {
    const k = email.toLowerCase()
    const cur = counts.get(k) || { last: 0, m30: 0, m90: 0, m365: 0 }
    if (when > cur.last) cur.last = when
    if (when >= D30) cur.m30++
    if (when >= D90) cur.m90++
    if (when >= D365) cur.m365++
    counts.set(k, cur)
  }

  const reEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  async function fetchMeta(id: string) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.provider_token}` } })
    if (!res.ok) return
    const data = await res.json() as any
    const ts = Number(data?.internalDate) || Date.now()
    const headers = (data?.payload?.headers || []) as { name: string; value: string }[]
    const peer = new Set<string>()
    for (const h of headers) {
      if (h.name === 'From' || h.name === 'To') {
        for (const m of (h.value || '').match(reEmail) || []) peer.add(m.toLowerCase())
      }
    }
    // 自分自身は除外
    if (emp.email) peer.delete(emp.email.toLowerCase())
    for (const e of peer) bump(e, ts)
  }

  const queue = [...ids]
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length > 0) {
      const id = queue.shift()
      if (!id) break
      try { await fetchMeta(id) } catch {}
    }
  })
  await Promise.all(workers)

  // business_cards.email に当たるものを company_id 配下で取得して突合
  const emails = Array.from(counts.keys())
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, scanned: ids.length, matched: 0, updated: 0, note: 'メールは見つかりましたが社内名刺と突合できる相手がいませんでした' })
  }

  // chunked IN クエリ (in() は 1000 要素まで)
  const cardEmailMap = new Map<string, { id: string; company_name: string | null }>()
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500)
    const { data } = await supabase
      .from('business_cards')
      .select('id, email, company_name')
      .in('email', chunk)
    for (const row of data || []) {
      if (row.email) cardEmailMap.set(row.email.toLowerCase(), { id: row.id, company_name: row.company_name })
    }
  }

  // contact_activity を upsert
  let updated = 0
  for (const [email, agg] of counts) {
    const card = cardEmailMap.get(email)
    if (!card) continue
    const { error } = await supabase
      .from('contact_activity')
      .upsert({
        company_id: emp.company_id,
        employee_id: emp.id,
        business_card_id: card.id,
        contact_email: email,
        company_name: card.company_name,
        message_count_30d: agg.m30,
        message_count_90d: agg.m90,
        message_count_365d: agg.m365,
        last_message_at: new Date(agg.last).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,employee_id,business_card_id' })
    if (!error) updated++
  }

  // last_contacted_at を business_cards にも反映
  for (const [email, agg] of counts) {
    const card = cardEmailMap.get(email)
    if (!card) continue
    await supabase
      .from('business_cards')
      .update({ last_contacted_at: new Date(agg.last).toISOString() })
      .eq('id', card.id)
  }

  return NextResponse.json({
    ok: true,
    scanned: ids.length,
    matched: cardEmailMap.size,
    updated,
  })
}
