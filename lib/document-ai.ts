// Google Document AI (Document OCR processor) ラッパー。
// Document OCR は entity を返さず、document.text に生テキストを入れて返す。
// 構造化は後段の Gemini で行う。
import { getGoogleAccessToken } from './gcp-auth'

export interface DocAIOcrResult {
  rawText: string
  pageCount: number
}

export async function processOcr(opts: {
  serviceAccountJson: string
  projectId: string
  location: string
  processorId: string
  mimeType: string
  imageBase64: string
}): Promise<DocAIOcrResult> {
  const { serviceAccountJson, projectId, location, processorId, mimeType, imageBase64 } = opts
  const token = await getGoogleAccessToken(serviceAccountJson)

  const url =
    `https://${location}-documentai.googleapis.com/v1/projects/${projectId}` +
    `/locations/${location}/processors/${processorId}:process`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: { mimeType, content: imageBase64 },
      skipHumanReview: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Document AI 失敗 (${res.status}): ${body.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    document?: { text?: string; pages?: unknown[] }
  }

  return {
    rawText: data.document?.text || '',
    pageCount: data.document?.pages?.length ?? 0,
  }
}
