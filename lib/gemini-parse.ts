// Google Gemini API (AI Studio, generativelanguage.googleapis.com) で
// 名刺の OCR テキストを構造化 JSON にする。
// 認証は API キー (https://aistudio.google.com/app/apikey で発行) を使う。
// Vertex AI / OAuth は使わない。
import type { OCRResult } from './supabase/types'

const PROMPT = `あなたは日本語ビジネス名刺のパーサーです。
以下の OCR テキストを読み、各フィールドを抽出して指定された JSON 形式で返してください。

重要なルール:
- 「氏名 (full_name)」には人物の姓名のみを入れる。「一般社団法人」「株式会社」「○○支社」「○○本部」のような組織名・部署名・支店名は絶対に入れない。
- 名前らしいパターンが見つからない場合は、推測せず null を返す。
- ふりがな (かな/カナ) は full_name_kana に入れる。漢字氏名は full_name に。
- 会社名は法人格 (株式会社, 有限会社, 一般社団法人, Inc., Ltd. 等) を含めて company_name に。
- 役職 (代表取締役, 部長, マネージャー 等) は position に。
- 部署 (営業部, 製造部, ○○本部, ○○課 等) は department に。
- 「TEL」「電話」「☎」は phone、「FAX」は fax、「Mobile」「携帯」は mobile。
  接頭辞 (TEL: 等) は値に含めない。
- 「〒123-4567」は postal_code、それ以外の住所は address。
- URL は website。LinkedIn は linkedin、X/Twitter は twitter、Facebook は facebook。
- 「私たちのミッション」「ゼロ」のようなキャッチコピー / スローガン / マーケティング文は絶対にどのフィールドにも入れない。それらが OCR に混入していてもすべて無視する。
- 該当データが無いフィールドは必ず null。推測で埋めない。
- confidence は 0〜1 の数値で、抽出全体の自信度。`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    full_name: { type: 'string', nullable: true },
    full_name_kana: { type: 'string', nullable: true },
    company_name: { type: 'string', nullable: true },
    company_name_kana: { type: 'string', nullable: true },
    department: { type: 'string', nullable: true },
    position: { type: 'string', nullable: true },
    email: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    mobile: { type: 'string', nullable: true },
    fax: { type: 'string', nullable: true },
    postal_code: { type: 'string', nullable: true },
    address: { type: 'string', nullable: true },
    website: { type: 'string', nullable: true },
    linkedin: { type: 'string', nullable: true },
    twitter: { type: 'string', nullable: true },
    facebook: { type: 'string', nullable: true },
    confidence: { type: 'number' },
  },
}

export async function parseBusinessCardText(opts: {
  apiKey: string
  rawText: string
  model?: string
}): Promise<OCRResult> {
  const { apiKey, rawText } = opts
  const model = opts.model || 'gemini-2.0-flash'

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${PROMPT}\n\n--- 名刺の OCR テキスト ---\n${rawText}` }] },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err: any = new Error(`Gemini API 失敗 (${res.status}): ${body.slice(0, 500)}`)
    err.status = res.status
    throw err
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Gemini レスポンスが JSON でない: ${text.slice(0, 200)}`)
  }

  const s = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined

  return {
    full_name: s(parsed.full_name),
    full_name_kana: s(parsed.full_name_kana),
    company_name: s(parsed.company_name),
    company_name_kana: s(parsed.company_name_kana),
    department: s(parsed.department),
    position: s(parsed.position),
    email: s(parsed.email),
    phone: s(parsed.phone),
    mobile: s(parsed.mobile),
    fax: s(parsed.fax),
    postal_code: s(parsed.postal_code),
    address: s(parsed.address),
    website: s(parsed.website),
    linkedin: s(parsed.linkedin),
    twitter: s(parsed.twitter),
    facebook: s(parsed.facebook),
    raw_text: rawText,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
  }
}
