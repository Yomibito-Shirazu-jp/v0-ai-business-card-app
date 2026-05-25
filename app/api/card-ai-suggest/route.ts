import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateText, Output } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  email_subject: z.string().describe('日本語の自然なメール件名（30文字以内）'),
  email_body: z
    .string()
    .describe('初回コンタクト用の丁寧な日本語メール本文。署名は含めない。300〜500字程度。'),
  talking_points: z
    .array(z.string())
    .min(3)
    .max(3)
    .describe('対面/電話での会話アイスブレイクとして使える具体的トピックを3件'),
  follow_up: z
    .string()
    .describe('次回フォローアップのおすすめタイミングと理由を1〜2行で'),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI_GATEWAY_API_KEY が未設定のため AI 機能は利用できません' },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    cardId?: string
    purpose?: 'first_contact' | 'follow_up' | 'sales'
  } | null
  if (!body?.cardId) {
    return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id, display_name, email')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) {
    return NextResponse.json({ error: 'employee not found' }, { status: 401 })
  }

  const { data: card } = await supabase
    .from('business_cards')
    .select('*')
    .eq('id', body.cardId)
    .eq('company_id', emp.company_id)
    .maybeSingle()
  if (!card) {
    return NextResponse.json({ error: 'card not found' }, { status: 404 })
  }

  const { data: companyProfile } = card.company_name
    ? await supabase
        .from('company_profiles')
        .select('industry, description, hq_address, website, employee_size, is_listed, established')
        .eq('company_id', emp.company_id)
        .ilike('company_name', card.company_name)
        .maybeSingle()
    : { data: null }

  const purpose = body.purpose ?? 'first_contact'
  const purposeLabel =
    purpose === 'follow_up'
      ? '商談後のフォローアップ'
      : purpose === 'sales'
        ? '新規提案・営業の打診'
        : '名刺交換後の初回コンタクト'

  const senderName = emp.display_name || '担当者'
  const target = {
    name: card.name || card.full_name,
    company: card.company_name,
    department: card.department,
    position: card.position,
    notes: card.notes,
    profile: companyProfile,
  }

  try {
    const { experimental_output } = await generateText({
      model: 'anthropic/claude-sonnet-4-5',
      experimental_output: Output.object({ schema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'あなたは日本のBtoB営業に精通したアシスタントです。',
                `目的: ${purposeLabel}`,
                `差出人: ${senderName} (${emp.email ?? ''})`,
                '相手の情報:',
                JSON.stringify(target, null, 2),
                '',
                '上記を踏まえ、相手に響く具体的な日本語メール下書きと、会話アイスブレイク、フォローアップ提案を JSON で返してください。',
                '- 過度に砕けず、ビジネス標準の敬語',
                '- 嘘や捏造はしない。情報が足りない部分は一般化した表現に',
                '- 業種/会社プロフィール/メモを必ず参照する',
              ].join('\n'),
            },
          ],
        },
      ],
    })

    if (!experimental_output) {
      return NextResponse.json({ error: 'AI 応答が空でした' }, { status: 502 })
    }
    return NextResponse.json({ suggestion: experimental_output, purpose })
  } catch (err) {
    console.log('[v0] card-ai-suggest failed:', (err as Error).message)
    return NextResponse.json(
      { error: 'AI 提案の生成に失敗しました', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
