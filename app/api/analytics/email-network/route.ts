import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// メール送受信ネットワーク
// 中心ノード = ログインユーザー (社員)
// 周辺ノード = contact_activity の各レコードに紐付く business_card
// エッジ = 自分 <→ 相手、太さは合計メッセージ件数 (90d)
// ノードサイズ = msgs_90d
// 色 = 業種別 (company_profiles.industry があれば)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, display_name, email, company_id')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single()
  if (!emp) return NextResponse.json({ nodes: [], links: [] })

  // 自分の contact_activity を取得
  const { data: acts } = await supabase
    .from('contact_activity')
    .select('id, business_card_id, contact_email, company_name, message_count_30d, message_count_90d, message_count_365d, last_message_at')
    .eq('employee_id', emp.id)
    .gt('message_count_90d', 0)
    .order('message_count_90d', { ascending: false })
    .limit(200)

  if (!acts || acts.length === 0) {
    return NextResponse.json({ nodes: [], links: [], hasData: false })
  }

  // business_cards 詳細
  const cardIds = Array.from(new Set(acts.map(a => a.business_card_id).filter(Boolean) as string[]))
  const { data: cards } = await supabase
    .from('business_cards')
    .select('id, full_name, name, company_name, position')
    .in('id', cardIds)
  const cardMap = new Map((cards || []).map(c => [c.id, c]))

  // company_profiles から industry を引いて色分け
  const companyNames = Array.from(new Set((cards || []).map(c => c.company_name).filter(Boolean) as string[]))
  const { data: profiles } = await supabase
    .from('company_profiles')
    .select('company_name, industry')
    .in('company_name', companyNames.length > 0 ? companyNames : ['__none__'])
  const industryByCompany = new Map((profiles || []).map(p => [p.company_name, p.industry]))

  const INDUSTRY_COLORS: Record<string, string> = {
    '製造業 (一般)': '#f59e0b', '製造業 (自動車)': '#f59e0b', '製造業 (電機)': '#f59e0b',
    '製造業 (食品)': '#f59e0b', '製造業 (医薬・化学)': '#f59e0b',
    '建設・不動産': '#a16207', '小売・卸売': '#ef4444', '物流・運輸': '#0891b2',
    'IT・ソフトウェア': '#3b82f6', '通信・キャリア': '#3b82f6',
    '広告・マーケティング': '#ec4899', '出版・印刷・メディア': '#8b5cf6',
    '映像・コンテンツ': '#8b5cf6', '金融 (銀行)': '#10b981', '金融 (証券・保険)': '#10b981',
    'コンサルティング・専門サービス': '#14b8a6', '人材・教育': '#06b6d4',
    '医療・介護': '#22c55e', '宿泊・観光・飲食': '#f97316',
    '電力・ガス・水道': '#84cc16', 'エネルギー・資源': '#84cc16',
    '官公庁・自治体': '#64748b', '非営利・社団・財団': '#64748b',
    '研究・開発機関': '#a855f7', '不動産・住宅': '#a16207', '商社': '#dc2626',
    '個人事業主・士業': '#94a3b8', 'その他': '#64748b',
  }

  // ノードとエッジ生成
  const meId = `me_${emp.id}`
  const nodes: any[] = [{
    id: meId,
    type: 'me',
    label: emp.display_name || emp.email || 'あなた',
    size: 30,
    color: '#3b82f6',
    msgs_90d: 0,
  }]
  const links: any[] = []

  let totalMsgs = 0
  for (const a of acts) {
    if (!a.business_card_id) continue
    const card = cardMap.get(a.business_card_id)
    if (!card) continue
    const m90 = a.message_count_90d || 0
    totalMsgs += m90
    const industry = card.company_name ? industryByCompany.get(card.company_name) : undefined
    const color = industry ? INDUSTRY_COLORS[industry] || '#64748b' : '#64748b'
    nodes.push({
      id: `card_${card.id}`,
      type: 'business_card',
      label: card.full_name || card.name || a.contact_email || '不明',
      sublabel: card.company_name || '',
      position: card.position,
      msgs_30d: a.message_count_30d || 0,
      msgs_90d: m90,
      msgs_365d: a.message_count_365d || 0,
      last_message_at: a.last_message_at,
      industry,
      color,
      // ノードサイズは sqrt スケールで 6〜26
      size: Math.max(6, Math.min(26, 6 + Math.sqrt(m90) * 2)),
    })
    links.push({
      source: meId,
      target: `card_${card.id}`,
      value: m90,
      width: Math.max(0.5, Math.min(6, Math.log10(m90 + 1) * 2)),
    })
  }

  // me ノードのサイズを合計に応じてアップ
  nodes[0].size = Math.max(20, Math.min(40, 20 + Math.sqrt(totalMsgs) / 4))
  nodes[0].msgs_90d = totalMsgs

  return NextResponse.json({
    nodes, links, hasData: true,
    summary: { contacts: acts.length, totalMessages: totalMsgs },
  })
}
