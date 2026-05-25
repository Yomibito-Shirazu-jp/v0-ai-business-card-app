// Gemini API 共通ヘルパー
// - 429 / 503 で 3 回まで指数バックオフ (1s, 3s, 8s)
// - 429 で 3 回失敗したら code: RATE_LIMITED 付きでスロー
// - 4xx (非 429) は即時失敗

const RETRY_STATUSES = new Set([429, 503])
const BACKOFF_MS = [1000, 3000, 8000]

export interface GeminiError extends Error {
  status: number
  code?: 'RATE_LIMITED' | 'GEMINI_ERROR' | 'GEMINI_NOT_CONFIGURED'
  body?: string
}

export async function callGeminiGenerateContent(opts: {
  apiKey: string
  model?: string
  body: any
  timeoutMs?: number
}): Promise<any> {
  const model = opts.model || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`

  let lastErrText = ''
  let lastStatus = 0
  for (let i = 0; i < BACKOFF_MS.length + 1; i++) {
    const ctrl = new AbortController()
    const timeoutId = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 55_000)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.body),
        signal: ctrl.signal,
      })
    } catch (e) {
      clearTimeout(timeoutId)
      if (i < BACKOFF_MS.length) {
        await new Promise(r => setTimeout(r, BACKOFF_MS[i]))
        continue
      }
      const err: GeminiError = Object.assign(new Error('Gemini への接続に失敗しました'), {
        status: 0,
        code: 'GEMINI_ERROR' as const,
      })
      throw err
    }
    clearTimeout(timeoutId)

    if (res.ok) return res.json()

    lastStatus = res.status
    lastErrText = (await res.text()).slice(0, 500)

    if (!RETRY_STATUSES.has(res.status)) break
    if (i >= BACKOFF_MS.length) break
    await new Promise(r => setTimeout(r, BACKOFF_MS[i]))
  }

  const isRate = lastStatus === 429
  const err: GeminiError = Object.assign(
    new Error(isRate
      ? 'AI が混雑しています。1〜2 分待ってから再試行してください。'
      : `Gemini API エラー (${lastStatus})`),
    {
      status: lastStatus,
      code: (isRate ? 'RATE_LIMITED' : 'GEMINI_ERROR') as 'RATE_LIMITED' | 'GEMINI_ERROR',
      body: lastErrText,
    },
  )
  throw err
}
