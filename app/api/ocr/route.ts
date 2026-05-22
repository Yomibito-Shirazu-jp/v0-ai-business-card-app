import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processOcr } from '@/lib/document-ai'
import { parseBusinessCardText } from '@/lib/gemini-parse'
import type { OCRResult } from '@/lib/supabase/types'

export const maxDuration = 60
export const runtime = 'nodejs'

// 名刺 OCR API
// 1. Google Document AI (Document OCR processor) で生テキストを取り出す
// 2. Vertex AI Gemini で構造化 JSON に整形する
// Service Account / project_id / processor_id は company_secrets テーブルから読む。
// .env / AI_GATEWAY_API_KEY 等の依存は無い。
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証 + company_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です', code: 'UNAUTHENTICATED' },
        { status: 401 },
      )
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id, company_id, status')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!employee) {
      return NextResponse.json(
        { success: false, error: '社員登録がありません' },
        { status: 403 },
      )
    }

    const { data: secrets, error: secretsError } = await supabase
      .from('company_secrets')
      .select('gcp_project_id, gcp_location, gcp_processor_id, gcp_service_account_json')
      .eq('company_id', employee.company_id)
      .single()

    if (
      secretsError ||
      !secrets ||
      !secrets.gcp_project_id ||
      !secrets.gcp_processor_id ||
      !secrets.gcp_service_account_json
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'OCR エンジンが未設定です。管理画面 → 設定 → Google Document AI から登録してください。',
          code: 'DOCAI_NOT_CONFIGURED',
        },
        { status: 503 },
      )
    }

    // 入力: { image: dataURL or base64 } を受け取る
    const body = await request.json()
    const image: string | undefined = body.image
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: '画像データが必要です' },
        { status: 400 },
      )
    }

    // data URL から mimeType を抽出。生 base64 のときは jpeg と仮定。
    let mimeType = 'image/jpeg'
    let imageBase64 = image
    const m = image.match(/^data:([^;]+);base64,(.+)$/)
    if (m) {
      mimeType = m[1]
      imageBase64 = m[2]
    }

    // 1. Document AI で OCR
    const ocr = await processOcr({
      serviceAccountJson: secrets.gcp_service_account_json,
      projectId: secrets.gcp_project_id,
      location: secrets.gcp_location || 'us',
      processorId: secrets.gcp_processor_id,
      mimeType,
      imageBase64,
    })

    if (!ocr.rawText || ocr.rawText.trim().length === 0) {
      // テキストが取れなかった場合も保存可能な形で返す
      const empty: OCRResult = {
        raw_text: '',
        confidence: 0,
      }
      return NextResponse.json(empty)
    }

    // 2. Gemini で構造化
    const result = await parseBusinessCardText({
      serviceAccountJson: secrets.gcp_service_account_json,
      projectId: secrets.gcp_project_id,
      rawText: ocr.rawText,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ocr] error:', error)
    const message =
      error instanceof Error ? error.message : 'OCR 処理に失敗しました'
    return NextResponse.json(
      { success: false, error: message, code: 'OCR_FAILED' },
      { status: 500 },
    )
  }
}
