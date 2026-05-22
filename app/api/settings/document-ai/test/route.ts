import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processOcr } from '@/lib/document-ai'
import { parseBusinessCardText } from '@/lib/gemini-parse'
import { parseBusinessCardRawText } from '@/lib/parse-card'

export const runtime = 'nodejs'
export const maxDuration = 60

// テスト送信: Document OCR → (Gemini → fallback rule parser) の両方を実行し
// それぞれの成功/失敗と抽出結果を返す。
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, stage: 'auth', error: '認証が必要です' })
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id, company_id, role, status')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!employee || (employee.role !== 'owner' && employee.role !== 'admin')) {
    return NextResponse.json({ ok: false, stage: 'auth', error: '管理者権限が必要です' })
  }

  const { data: secrets } = await supabase
    .from('company_secrets')
    .select('gcp_project_id, gcp_location, gcp_processor_id, gcp_service_account_json')
    .eq('company_id', employee.company_id)
    .single()

  if (
    !secrets ||
    !secrets.gcp_project_id ||
    !secrets.gcp_processor_id ||
    !secrets.gcp_service_account_json
  ) {
    return NextResponse.json({
      ok: false,
      stage: 'config',
      error: 'プロジェクト ID / プロセッサ ID / Service Account JSON のいずれかが未設定です。',
    })
  }

  const body = await request.json().catch(() => ({}))
  const image: string | undefined = body.image
  if (!image) {
    return NextResponse.json({ ok: false, stage: 'input', error: '画像を選択してください' })
  }

  let mimeType = 'image/jpeg'
  let imageBase64 = image
  const m = image.match(/^data:([^;]+);base64,(.+)$/)
  if (m) {
    mimeType = m[1]
    imageBase64 = m[2]
  }

  let ocrResult
  try {
    ocrResult = await processOcr({
      serviceAccountJson: secrets.gcp_service_account_json,
      projectId: secrets.gcp_project_id,
      location: secrets.gcp_location || 'us',
      processorId: secrets.gcp_processor_id,
      mimeType,
      imageBase64,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      stage: 'ocr',
      error: e instanceof Error ? e.message : String(e),
    })
  }

  if (!ocrResult.rawText) {
    return NextResponse.json({
      ok: false,
      stage: 'ocr',
      error: 'Document OCR からテキストが返ってきませんでした',
    })
  }

  let parsed
  let parser: 'gemini' | 'rule'
  let geminiError: string | undefined
  try {
    parsed = await parseBusinessCardText({
      serviceAccountJson: secrets.gcp_service_account_json,
      projectId: secrets.gcp_project_id,
      rawText: ocrResult.rawText,
    })
    parser = 'gemini'
  } catch (e) {
    geminiError = e instanceof Error ? e.message : String(e)
    parsed = parseBusinessCardRawText(ocrResult.rawText)
    parser = 'rule'
  }

  return NextResponse.json({
    ok: true,
    parser,
    geminiError,
    raw_text_preview: ocrResult.rawText.slice(0, 400),
    page_count: ocrResult.pageCount,
    parsed,
  })
}
