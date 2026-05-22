import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { OCRResult } from '@/lib/supabase/types'

export const maxDuration = 60
export const runtime = 'nodejs'

// 名刺 OCR API
// AI SDK 6 + Vercel AI Gateway を利用。
// 認証情報がない場合は 503 + setup_required で UI 側にセットアップ手順を表示させる。
export async function POST(request: NextRequest) {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(
      {
        error:
          'OCR エンジンが未設定です。Vercel の Settings → Environment Variables で AI_GATEWAY_API_KEY を設定してください。',
        setup_required: true,
      },
      { status: 503 },
    )
  }

  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: '画像データが必要です' }, { status: 400 })
    }

    // data URL でも生 base64 でも受け取れるよう正規化
    const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`

    // OpenAI strict モード対応のため optional() ではなく nullable() を使う
    const schema = z.object({
      full_name: z.string().nullable(),
      full_name_kana: z.string().nullable(),
      company_name: z.string().nullable(),
      company_name_kana: z.string().nullable(),
      department: z.string().nullable(),
      position: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      mobile: z.string().nullable(),
      fax: z.string().nullable(),
      postal_code: z.string().nullable(),
      address: z.string().nullable(),
      website: z.string().nullable(),
      linkedin: z.string().nullable(),
      twitter: z.string().nullable(),
      facebook: z.string().nullable(),
      raw_text: z.string(),
      confidence: z.number().min(0).max(1),
    })

    const { experimental_output } = await generateText({
      model: 'openai/gpt-4o-mini',
      experimental_output: Output.object({ schema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: dataUrl },
            {
              type: 'text',
              text: [
                'この日本語の名刺画像から情報を抽出してください。',
                '- ふりがな(かな/カナ)が記載されていれば抽出すること',
                '- 該当項目が無いものは null を返すこと',
                '- 全文を raw_text に格納し、抽出の信頼度を 0〜1 の confidence で返すこと',
              ].join('\n'),
            },
          ],
        },
      ],
    })

    if (!experimental_output) {
      return NextResponse.json(
        { error: 'OCR エンジンから構造化レスポンスを取得できませんでした' },
        { status: 502 },
      )
    }

    // zod の null を OCRResult (string | undefined) に正規化
    const raw = experimental_output as z.infer<typeof schema>
    const ocr: OCRResult = {
      full_name: raw.full_name ?? undefined,
      full_name_kana: raw.full_name_kana ?? undefined,
      company_name: raw.company_name ?? undefined,
      company_name_kana: raw.company_name_kana ?? undefined,
      department: raw.department ?? undefined,
      position: raw.position ?? undefined,
      email: raw.email ?? undefined,
      phone: raw.phone ?? undefined,
      mobile: raw.mobile ?? undefined,
      fax: raw.fax ?? undefined,
      postal_code: raw.postal_code ?? undefined,
      address: raw.address ?? undefined,
      website: raw.website ?? undefined,
      linkedin: raw.linkedin ?? undefined,
      twitter: raw.twitter ?? undefined,
      facebook: raw.facebook ?? undefined,
      raw_text: raw.raw_text ?? '',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
    }
    return NextResponse.json(ocr)
  } catch (error) {
    console.error('[ocr] error:', error)
    const message = error instanceof Error ? error.message : 'OCR処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
