"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"

export function GmailSyncButton({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setBusy(true); setMsg(null); setErr(null)
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || "同期失敗")
      setMsg(`Gmail ${j.scanned} 通スキャン、名刺 ${j.matched} 件突合、${j.updated} 件更新`)
      if (j.matched > 0 && onDone) setTimeout(onDone, 2000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={busy} variant="default" className="gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Gmail を今すぐ同期
      </Button>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && <p className="text-sm text-destructive whitespace-pre-wrap">{err}</p>}
      <p className="text-xs text-muted-foreground">
        過去 90 日分のメタデータ (送信者 / 受信者 / 日時) のみを読みます。本文は保存しません。
      </p>
    </div>
  )
}
