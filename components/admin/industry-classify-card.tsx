"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react"

export function IndustryClassifyCard() {
  const [running, setRunning] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [updated, setUpdated] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setRunning(true); setError(null); setProcessed(0); setUpdated(0); setDone(false)
    try {
      while (true) {
        const res = await fetch("/api/admin/classify-industries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 30 }),
        })
        const j = await res.json()
        if (!res.ok || !j.ok) throw new Error(j.error || "推定失敗")
        setProcessed(p => p + (j.processed || 0))
        setUpdated(u => u + (j.updated || 0))
        setRemaining(j.remaining)
        if (j.done || (j.processed || 0) === 0) {
          setDone(true)
          break
        }
        // Gemini rate limit 配慮で 1 秒待つ
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const total = remaining !== null ? processed + remaining : null
  const pct = total ? Math.floor((processed / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          会社の業種を一括推定
        </CardTitle>
        <CardDescription>
          名刺登録されている全会社について、Gemini が業種 (製造業 / IT / 金融 等 28 区分) を推定して `company_profiles.industry` に保存します。一度実行しておくと分析画面と名刺詳細で業種バッジが出ます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {running && (
          <>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              処理済 {processed} 社 / 残り {remaining ?? '?'} 社 (更新 {updated} 件)
            </p>
          </>
        )}
        {done && !running && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> 完了しました ({processed} 社処理 / {updated} 件更新)
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={start} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          業種を一括推定
        </Button>
        <p className="text-xs text-muted-foreground">
          Gemini API は 1 リクエスト = 約 30 社まとめて分類。1 秒間隔で繰り返し叩き、全件処理が終わるまで自動継続します。
        </p>
      </CardContent>
    </Card>
  )
}
