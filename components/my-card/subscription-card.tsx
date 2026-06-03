"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Printer, CheckCircle2, AlertTriangle, Clock } from "lucide-react"

interface SubStatus {
  plan: { name: string; monthly_price_jpy: number; monthly_cards: number }
  status: "active" | "grace" | "suspended" | "new"
  last_order: { id: string; created_at: string; quantity: number } | null
  days_since_last: number | null
  next_recommended_at: string | null
  totals: { d30: number; d90: number; d365: number }
  active_employees: number
  history: { id: string; created_at: string; quantity: number; total_cost: number | null; status: string }[]
}

const STATUS = {
  active:    { label: "アクティブ", color: "bg-emerald-600", icon: CheckCircle2, hint: "ご利用継続中。次回発注予定日が近づくと通知します。" },
  grace:    { label: "要発注 (猶予期間)", color: "bg-amber-500", icon: Clock, hint: "前回発注から 30 日以上経過しています。継続のため、近いうちに発注してください。" },
  suspended: { label: "停止予定", color: "bg-red-500", icon: AlertTriangle, hint: "前回発注から 60 日以上経過しています。分析機能の利用が間もなく停止されます。" },
  new:       { label: "未契約", color: "bg-slate-500", icon: Clock, hint: "まだ発注がありません。下のボタンから最初の発注をしてください。" },
}

export function SubscriptionCard() {
  const [data, setData] = useState<SubStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || "取得失敗")
        setData(j)
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [])

  if (err) return <p className="text-destructive text-sm">{err}</p>
  if (!data) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>

  const st = STATUS[data.status]
  const Icon = st.icon
  const remainingDays = data.next_recommended_at
    ? Math.max(0, Math.ceil((new Date(data.next_recommended_at).getTime() - Date.now()) / 86400000))
    : null
  const progressPct = data.days_since_last === null ? 0 : Math.min(100, (data.days_since_last / 30) * 100)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-4 h-4" />
            名刺サブスク
          </CardTitle>
          <CardDescription>{st.hint}</CardDescription>
        </div>
        <Badge className={`${st.color} hover:${st.color} text-white`}>{st.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* プラン詳細 */}
        <div className="flex flex-wrap gap-4 items-baseline">
          <div>
            <div className="text-xs text-muted-foreground">プラン</div>
            <div className="font-semibold">{data.plan.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">料金</div>
            <div className="font-semibold">¥{data.plan.monthly_price_jpy.toLocaleString()} / 月</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">枚数</div>
            <div className="font-semibold">{data.plan.monthly_cards} 枚 / 月</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">アクティブ社員</div>
            <div className="font-semibold">{data.active_employees} 名</div>
          </div>
        </div>

        {/* 経過 progress */}
        {data.last_order && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>前回発注から {data.days_since_last} 日経過</span>
              <span>{remainingDays !== null ? `次回推奨まで ${remainingDays} 日` : ""}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* 集計 */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md border border-border p-2">
            <div className="text-xs text-muted-foreground">30 日</div>
            <div className="font-semibold tabular-nums">{data.totals.d30} 枚</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-xs text-muted-foreground">90 日</div>
            <div className="font-semibold tabular-nums">{data.totals.d90} 枚</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-xs text-muted-foreground">365 日</div>
            <div className="font-semibold tabular-nums">{data.totals.d365} 枚</div>
          </div>
        </div>

        {/* 履歴 */}
        {data.history.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">直近の発注</div>
            <div className="space-y-1">
              {data.history.map(h => (
                <div key={h.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString("ja-JP")}</span>
                  <span>{h.quantity} 枚{h.total_cost ? ` / ¥${h.total_cost.toLocaleString()}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
