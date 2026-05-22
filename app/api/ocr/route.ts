import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { OCRResult } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  // AI Gateway 認証情報がないと動かないため、明確に 503 で返す
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(
      {
        error:
          'OCR エンジンが未設定です。Vercel の環境変数に AI_GATEWAY_API_KEY を設定してください。',
        setup_required: true,
      },
      { status: 503 }
    )
  }

  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: '画像データが必要です' }, { status: 400 })
    }

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
            },
            {
              type: 'text',
              text: `この名刺画像からテキストを抽出し、以下のJSON形式で返してください。
日本語の名刺を想定しています。ふりがなが記載されていれば抽出してください。

{
  "full_name": "氏名",
  "full_name_kana": "氏名のふりがな（あれば）",
  "company_name": "会社名",
  "company_name_kana": "会社名のふりがな（あれば）",
  "department": "部署名",
  "position": "役職",
  "email": "メールアドレス",
  "phone": "電話番号（固定）",
  "mobile": "携帯電話番号",
  "fax": "FAX番号",
  "postal_code": "郵便番号",
  "address": "住所",
  "website": "WebサイトURL",
  "linkedin": "LinkedIn URL",
  "twitter": "Twitter/X URL",
  "facebook": "Facebook URL",
  "raw_text": "名刺に記載されている全テキスト",
  "confidence": 0.0〜1.0の信頼度スコア
}

存在しない項目はnullにしてください。JSONのみを返してください。`,
            },
          ],
        },
      ],
    })

    let ocrResult: OCRResult
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON not found in response')
      ocrResult = JSON.parse(jsonMatch[0])
    } catch {
      ocrResult = { raw_text: text, confidence: 0.5 }
    }

    return NextResponse.json(ocrResult)
  } catch (error) {
    console.error('OCR error:', error)
    const message = error instanceof Error ? error.message : 'OCR処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
