import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGeminiGenerateContent } from '@/lib/gemini-fetch'

export const runtime = 'nodejs'
export const maxDuration = 60

// Gemini と会話して、最終的に 1 つの automation 設定 JSON を構築する。
// 入力: messages: [{ role, text }]
// 出力: { reply, draft?: { name, trigger_type, action_type, description, config } }
//   draft が埋まっていれば「保存可能な状態」。reply は必ず返す。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees').select('company_id, display_name, email')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp) return NextResponse.json({ error: '社員登録がありません' }, { status: 403 })

  const { data: secrets } = await supabase
    .from('company_secrets').select('gemini_api_key')
    .eq('company_id', emp.company_id).single()
  if (!secrets?.gemini_api_key) {
    return NextResponse.json({ error: 'Gemini API キー未設定', code: 'NO_GEMINI' }, { status: 503 })
  }

  const body = await req.json()
  const messages: { role: 'user' | 'assistant'; text: string }[] = Array.isArray(body?.messages) ? body.messages : []
  if (messages.length === 0) return NextResponse.json({ error: 'メッセージなし' }, { status: 400 })

  const system = `あなたは社内自動化アシスタント。ユーザーが「○○を自動でやりたい」と相談してくるので、不足情報をヒアリングして、最終的に 1 つの automation 設定を組み立てます。

利用可能なトリガー:
  - gmail_received: Gmail に新着メールが届いた
  - card_scanned: 名刺がスキャンされた
  - card_added: 新しい名刺が登録された
  - card_updated: 名刺情報が更新された
  - manual: 手動実行ボタン
  - schedule: スケジュール (cron)

利用可能なアクション:
  - gmail_reply_draft: Gmail に返信案を下書き保存
  - drive_save_attachment: Gmail 添付ファイルを Drive に保存
  - slack_notify: Slack に通知
  - send_email: メール送信
  - calendar_create: Google Calendar に予定作成
  - card_tag: 名刺にタグを付与
  - webhook: Webhook 呼び出し
  - custom: その他

config の例:
  gmail_reply_draft -> { filter: { from?: string, subject_contains?: string }, prompt: string, tone: "丁寧"|"カジュアル"|"端的" }
  drive_save_attachment -> { folder_id: string, filter: { mime?: string, sender?: string } }
  slack_notify -> { webhook_url: string, message_template: string }

出力フォーマット (必ず JSON):
{
  "reply": "ユーザーへの応答メッセージ",
  "draft": { name, trigger_type, action_type, description, config } | null
}

ヒアリングが完了して保存可能な状態になったときに draft を埋める。それ以前は null。draft を埋めるのは「ユーザーがこの内容で保存していいと同意した時」または「明確に十分情報が揃った時」のみ。

ユーザー: ${emp.display_name || emp.email}`

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))

  let data: any
  try {
    data = await callGeminiGenerateContent({
      apiKey: secrets.gemini_api_key,
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              reply: { type: 'string' },
              draft: {
                type: 'object',
                nullable: true,
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  trigger_type: { type: 'string' },
                  action_type: { type: 'string' },
                  config: { type: 'object' },
                },
              },
            },
          },
        },
      },
    })
  } catch (e: any) {
    const status = e?.code === 'RATE_LIMITED' ? 429 : 502
    return NextResponse.json({ error: e?.message || 'AI 応答失敗', code: e?.code }, { status })
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  let out: any = { reply: '応答に失敗しました', draft: null }
  try { out = JSON.parse(text) } catch { /* keep default */ }
  return NextResponse.json(out)
}
