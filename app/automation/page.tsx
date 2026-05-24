"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Sparkles, Plus, Trash2, Mail, FolderSync, Bell, Calendar, Tag as TagIcon, Globe } from "lucide-react"

interface Msg { role: "user" | "assistant"; text: string }
interface Draft {
  name: string
  description?: string
  trigger_type: string
  action_type: string
  config: Record<string, unknown>
}
interface Automation {
  id: string
  name: string
  description: string | null
  trigger_type: string
  action_type: string
  config: any
  status: string
  last_run_at: string | null
  run_count: number
  created_at: string
}

const TEMPLATES: { title: string; desc: string; icon: any; seed: string }[] = [
  { title: "Gmail 返信下書き", desc: "受信メールを Gemini が解析して返信案を Gmail 下書きに保存", icon: Mail, seed: "Gmail で受け取ったメールに対して、Gemini で返信案を作って下書き保存したい。" },
  { title: "添付 → Drive 自動格納", desc: "Gmail の添付ファイルを指定の Google Drive フォルダに自動保存", icon: FolderSync, seed: "Gmail の添付ファイルを Google Drive の指定フォルダに自動で保存したい。" },
  { title: "新規名刺 → 通知", desc: "新しい名刺がスキャンされたら Slack に通知", icon: Bell, seed: "新しい名刺がスキャン登録されたら Slack に通知を送りたい。" },
  { title: "重要顧客フォローアップ", desc: "60 日連絡が途絶えた顧客に自動でフォローメール下書き", icon: Mail, seed: "60 日以上連絡が途絶えた顧客に、フォローアップメールの下書きを自動生成したい。" },
  { title: "カレンダー予定", desc: "新規名刺登録時に Google カレンダーに「フォローアップ」の予定を作成", icon: Calendar, seed: "新規名刺を登録したときに、3 日後にフォローアップする Google カレンダー予定を作って欲しい。" },
  { title: "自動タグ付け", desc: "特定の業種の名刺に自動でタグを付ける", icon: TagIcon, seed: "IT 業界の名刺に自動でタグを付けたい。" },
]

const TRIGGER_LABEL: Record<string, string> = {
  gmail_received: "Gmail 受信", card_scanned: "名刺スキャン", card_added: "名刺追加",
  card_updated: "名刺更新", manual: "手動", schedule: "スケジュール",
}
const ACTION_LABEL: Record<string, string> = {
  gmail_reply_draft: "Gmail 返信下書き", drive_save_attachment: "Drive 保存",
  slack_notify: "Slack 通知", send_email: "メール送信", calendar_create: "カレンダー予定",
  card_tag: "タグ付け", webhook: "Webhook", custom: "カスタム",
}

export default function AutomationPage() {
  const [items, setItems] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [chat, setChat] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function loadList() {
    setLoading(true)
    try {
      const r = await fetch("/api/automations", { cache: "no-store" })
      const j = await r.json()
      setItems(j.items || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [chat, thinking])

  async function send(text: string) {
    const t = text.trim()
    if (!t || thinking) return
    const next = [...chat, { role: "user" as const, text: t }]
    setChat(next); setInput(""); setThinking(true); setErr(null)
    try {
      const r = await fetch("/api/automations/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "失敗")
      setChat(prev => [...prev, { role: "assistant", text: j.reply || "(空)" }])
      if (j.draft) setDraft(j.draft)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setThinking(false) }
  }

  async function saveDraft() {
    if (!draft) return
    setSaving(true); setErr(null)
    try {
      const r = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "draft" }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "保存失敗")
      setToast(`「${draft.name}」を保存しました`)
      setTimeout(() => setToast(null), 3000)
      setDraft(null); setChat([])
      loadList()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  async function toggleStatus(item: Automation, next: string) {
    await fetch(`/api/automations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    loadList()
  }
  async function remove(item: Automation) {
    if (!confirm(`「${item.name}」を削除しますか？`)) return
    await fetch(`/api/automations/${item.id}`, { method: "DELETE" })
    loadList()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-card gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← ホーム</Link>
        <Sparkles className="w-5 h-5 text-primary ml-2" />
        <h1 className="font-semibold">AI 自動化</h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <div className="font-medium text-emerald-700 mb-1">AI と話して自動化を作る</div>
          <div className="text-muted-foreground">「○○を自動でやりたい」と話しかけると、Gemini がヒアリングして自動化設定を組み立てます。実行エンジン (Gmail/Drive への書き込み) は次フェーズで提供予定。</div>
        </div>

        {/* テンプレート */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">よく使われる自動化テンプレート</CardTitle>
            <CardDescription>クリックでチャットを開始します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATES.map(t => (
                <button key={t.title} onClick={() => { setChat([{ role: "user", text: t.seed }]); send(t.seed) }}
                  className="text-left p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors space-y-1">
                  <div className="flex items-center gap-2"><t.icon className="w-4 h-4 text-primary" /><div className="font-medium text-sm">{t.title}</div></div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* チャットビルダー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">チャットで自動化を作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div ref={scrollRef} className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {chat.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  上のテンプレートをクリックするか、メッセージを入力して開始してください。
                </p>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-primary/5 border border-primary/20" : "bg-card border border-border"}`}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{m.role === "user" ? "あなた" : "アシスタント"}</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
                </div>
              ))}
              {thinking && <div className="flex items-center gap-2 text-sm text-muted-foreground p-3"><Loader2 className="w-4 h-4 animate-spin" /> 考え中...</div>}
            </div>

            {draft && (
              <Card className="border-emerald-500/40 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">提案された自動化</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div><strong>{draft.name}</strong></div>
                  {draft.description && <div className="text-muted-foreground">{draft.description}</div>}
                  <div className="flex gap-2">
                    <Badge variant="outline">{TRIGGER_LABEL[draft.trigger_type] ?? draft.trigger_type}</Badge>
                    <Badge variant="outline">{ACTION_LABEL[draft.action_type] ?? draft.action_type}</Badge>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">設定 JSON</summary>
                    <pre className="mt-1 p-2 rounded bg-muted/40 overflow-x-auto">{JSON.stringify(draft.config, null, 2)}</pre>
                  </details>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={saveDraft} disabled={saving} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      この内容で保存
                    </Button>
                    <Button variant="outline" onClick={() => setDraft(null)}>修正する</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="例: 添付ファイルを Drive に自動保存したい" disabled={thinking} />
              <Button type="submit" disabled={thinking || !input.trim()}>
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {err && <p className="text-sm text-destructive">{err}</p>}
            {toast && <p className="text-sm text-emerald-700">{toast}</p>}
          </CardContent>
        </Card>

        {/* 保存済み */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">保存済みの自動化 ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">まだ自動化はありません。上のチャットから作成してください。</p>
            ) : (
              <div className="space-y-3">
                {items.map(a => (
                  <div key={a.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium">{a.name}</div>
                      {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                      <div className="flex gap-1 flex-wrap mt-1">
                        <Badge variant="outline" className="text-[10px]">{TRIGGER_LABEL[a.trigger_type] ?? a.trigger_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ACTION_LABEL[a.action_type] ?? a.action_type}</Badge>
                        <Badge className={`text-[10px] ${a.status === "active" ? "bg-emerald-600" : a.status === "paused" ? "bg-amber-500" : "bg-slate-500"}`}>
                          {a.status === "active" ? "稼働中" : a.status === "paused" ? "停止中" : "下書き"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {a.status !== "active" ? (
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(a, "active")}>有効化</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(a, "paused")}>停止</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(a)} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              ※ 実行エンジンは現在開発中です。保存した自動化はベータ機能としてキューに登録され、Phase 2 リリース時に自動実行されます。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
