import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 広告/LP 経由の問い合わせを受け付け、sales_leads に保存
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const company_name = String(body.company_name || '').trim()
    const contact_name = String(body.contact_name || '').trim()
    const email = String(body.email || '').trim()
    if (!company_name || !contact_name || !email) {
      return NextResponse.json({ ok: false, error: '会社名 / 担当者名 / メール は必須です' }, { status: 400 })
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'メールの形式が不正です' }, { status: 400 })
    }

    const supabase = await createClient()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const ua = req.headers.get('user-agent') || null
    const referer = req.headers.get('referer') || null

    const insertData = {
      company_name,
      contact_name,
      email,
      phone: body.phone || null,
      employees_count: typeof body.employees_count === 'number' ? body.employees_count : null,
      message: body.message || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      referrer: referer,
      user_agent: ua,
      ip_address: ip,
    }

    const { data, error } = await supabase.from('sales_leads').insert(insertData).select().single()
    if (error) {
      console.error('[contact-sales] insert error:', error)
      return NextResponse.json({ ok: false, error: '送信に失敗しました' }, { status: 500 })
    }

    // TODO: Slack/Email 通知 (将来) — 環境変数 SALES_NOTIFICATION_WEBHOOK があれば送信
    if (process.env.SALES_NOTIFICATION_WEBHOOK) {
      try {
        await fetch(process.env.SALES_NOTIFICATION_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📥 新規お問い合わせ\n会社: ${company_name}\n担当: ${contact_name}\nメール: ${email}\n電話: ${body.phone || '-'}\n人数: ${body.employees_count || '-'}\n経路: ${body.utm_source || '-'} / ${body.utm_campaign || '-'}\nメッセージ: ${body.message || '-'}`,
          }),
        })
      } catch { /* 通知失敗は無視 */ }
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
