"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Sparkles, RotateCcw } from "lucide-react"
import Link from "next/link"

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

const SUGGESTED = [
  "今月の名刺登録のサマリを教えて",
  "営業機会を作るべき先はどこ?",
  "○○株式会社にフォローアップメールの下書きを作って",
  "上位 5 社の傾向を分析して",
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy])

  async function send(text: string) {
    const value = text.trim()
    if (!value || busy) return
    const next = [...messages, { role: "user" as const, text: value }]
    setMessages(next)
    setInput("")
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "応答に失敗しました")
      setMessages(prev => [...prev, { role: "assistant", text: j.reply || "(返信なし)" }])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-card gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← ホーム</Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-semibold">AI アシスタント</h1>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => setMessages([])}>
            <RotateCcw className="w-3.5 h-3.5" /> リセット
          </Button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">何でも聞いてください</h2>
                <p className="text-muted-foreground text-sm mt-1">名刺データを背景に Gemini が答えます</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left p-3 rounded-lg border border-border hover:bg-accent/40 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <Card key={i} className={`p-3 ${m.role === "user" ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                {m.role === "user" ? "あなた" : "アシスタント"}
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
            </Card>
          ))}

          {busy && (
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">アシスタント</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> 考え中...
              </div>
            </Card>
          )}

          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-lg whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 md:px-6 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="max-w-2xl mx-auto flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            disabled={busy}
            autoFocus
          />
          <Button type="submit" disabled={busy || !input.trim()} className="gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
