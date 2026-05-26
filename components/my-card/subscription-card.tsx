"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, Truck, Package, CheckCircle2, Pause, Play, Edit3 } from "lucide-react"

interface HistoryItem {
  id: string
  status: string
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
  tracking_number: string | null
  total_cost: number | null
  quantity: number
}
interface SubStatus {
  plan: { name: string; monthly_price_jpy: number; monthly_cards: number }
  active: boolean
  delivery_day_of_month: number | null
  subscription_started_at: string | null
  next_delivery_at: string | null
  days_until_next: number | null
  history: HistoryItem[]
  yearly: { quantity: number; amount: number; deliveries: number }
  active_employees: number
}

export function SubscriptionCard() {
  const [data, setData] = useState<SubStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [day, setDay] = useState(25)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    ;(async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || "取得失敗")
        setData(j)
        if (j.delivery_day_of_month) setDay(j.delivery_day_of_month)
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [])

  async function save(updates: Partial<{ delivery_day_of_month: number; subscription_active: boolean }>) {
    setSaving(true); setErr(null)
    try {
      const res = await fetch("/api/subscription/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "保存失敗")
      // reload
      const r = await fetch("/api/subscription/status", { cache: "no-store" })
      const j2 = await r.json()
      setData(j2)
      setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (err) return <p className="text-destructive text-sm">{err}</p>
  if (!data) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              名刺の定期お届け
            </CardTitle>
            <CardDescription>
              {data.active
                ? `毎月 ${data.delivery_day_of_month} 日に ${data.plan.monthly_cards} 枚お届け (¥${data.plan.monthly_price_jpy.toLocaleString()} / 月)`
                : "サブスク停止中"}
            </CardDescription>
          </div>
          {data.active ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              稼働中
            </Badge>
          ) : (
            <Badge className="bg-slate-500 hover:bg-slate-500 text-white">
              <Pause className="w-3.5 h-3.5 mr-1" />
              停止中
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 次回お届け */}
        {data.active && data.next_delivery_at && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-xs text-muted-foreground">次回お届け予定</div>
                <div className="font-semibold">
                  {mounted ? new Date(data.next_delivery_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }) : "—"}
                </div>
              </div>
            </div>
            {data.days_until_next !== null && (
              <Badge variant="outline" className="text-blue-600 border-blue-500/40">
                あと {data.days_until_next} 日
              </Badge>
            )}
          </div>
        )}

        {/* お届け日変更 */}
        {editing ? (
          <div className="space-y-2 p-3 rounded-lg border border-border">
            <div className="text-sm">毎月のお届け日 (1〜28)</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={28}
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value || '1'))}
                className="w-20 h-9 px-2 rounded-md border border-border bg-background text-sm"
              />
              <span className="text-sm text-muted-foreground">日</span>
              <Button size="sm" onClick={() => save({ delivery_day_of_month: day })} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>キャンセル</Button>
            </div>
            <p className="text-xs text-muted-foreground">29-31 日は月によって存在しないため指定できません。</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
              <Edit3 className="w-3.5 h-3.5" />
              お届け日を変更
            </Button>
            {data.active ? (
              <Button size="sm" variant="outline" className="gap-1" disabled={saving}
                onClick={() => { if (confirm('サブスクを停止しますか？')) save({ subscription_active: false }) }}>
                <Pause className="w-3.5 h-3.5" />
                サブスク停止
              </Button>
            ) : (
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={saving}
                onClick={() => save({ subscription_active: true })}>
                <Play className="w-3.5 h-3.5" />
                サブスク再開
              </Button>
            )}
          </div>
        )}

        {/* サマリ */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Mini label="年間お届け回数" value={`${data.yearly.deliveries} 回`} />
          <Mini label="年間枚数" value={`${data.yearly.quantity.toLocaleString()} 枚`} />
          <Mini label="アクティブ社員" value={`${data.active_employees} 名`} />
        </div>

        {/* お届け履歴 */}
        {data.history.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground">お届け履歴 (直近 12 回)</div>
            <div className="space-y-1">
              {data.history.slice(0, 5).map(h => (
                <div key={h.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span>{mounted ? new Date(h.created_at).toLocaleDateString("ja-JP") : "—"}</span>
                    <span className="text-muted-foreground">{h.quantity} 枚</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.tracking_number && (
                      <span className="text-muted-foreground font-mono text-[10px]">#{h.tracking_number}</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {h.delivered_at ? '配達完了' : h.shipped_at ? '発送済' : '準備中'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}
