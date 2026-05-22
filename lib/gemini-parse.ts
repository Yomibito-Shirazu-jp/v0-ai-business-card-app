// Vertex AI Gemini で名刺の OCR テキストを構造化 JSON にする。
// Document AI と同じ Service Account / cloud-platform scope で叩ける。
import { getGoogleAccessToken } from './gcp-auth'
import type { OCRResult } from './supabase/types'

const PROMPT = `あなたは日本語ビジネス名刺のパーサーです。
以下の OCR テキストを読み、各フィールドを抽出して指定された JSON 形式で返してください。

ルール:
- 氏名は full_name、ふりがな (かな/カナ) があれば full_name_kana に分離。
- 会社名は company_name、会社名のふりがながあれば company_name_kana に。
- 役職は「代表取締役」「部長」「マネージャー」などを position に。
- 部署 (営業部, 製造部 等) は department に分離。
- 「TEL」「電話」「☎」は phone、「FAX」「ファックス」は fax、「Mobile」「携帯」は mobile。
  接頭辞 (TEL: 等) は値に含めない。
- 「〒123-4567」は postal_code、それ以外の住所は address。
- URL は website。LinkedIn は linkedin、X/Twitter は twitter、Facebook は facebook。
- 該当データが無いフィールドは必ず null。推測で埋めない。
- raw_text は空文字でよい (こちらで埋める)。
- confidence は 0〜1 の数値で、抽出全体の自信度。`

export async function parseBusinessCardText(opts: {
  serviceAccountJson: string
  projectId: string
  rawText: string
  model?: string
}): Promise<OCRResult> {
  const { serviceAccountJson, projectId, rawText } = opts
  const model = opts.model || 'gemini-1.5-flash-002'

  const token = await getGoogleAccessToken(serviceAccountJson)
  const url =
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}` +
    `/locations/us-central1/publishers/google/models/${model}:generateContent`

  const responseSchema = {
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

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${PROMPT}\n\n--- 名刺の OCR テキスト ---\n${rawText}` }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vertex AI Gemini 失敗 (${res.status}): ${body.slice(0, 500)}`)
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
    confidence:
      typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
  }
}
