"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle } from "lucide-react"

interface ColdItem {
  id: string
  contact_email: string
  contact_name?: string
  company_name: string | null
  last_message_at: string | null
  message_count_30d: number
  message_count_90d: number
  message_count_365d: number
  days_since_last: number | null
  severity: "red" | "yellow" | "gray"
  business_card_id: string | null
}

interface ColdData {
  has_data: boolean
  fallback?: string
  items: ColdItem[]
  summary: { red: number; yellow: number; gray: number }
}

export function ColdView({ onCardClick }: { onCardClick?: (id: string) => void }) {
  const [data, setData] = useState<ColdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "red" | "yellow" | "gray">("all")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics/cold", { cache: "no-store" })
        if (!res.ok) throw new Error(await res.text())
        const j = await res.json()
        if (!cancelled) setData(j)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> 集計中...
      </div>
    )
  }
  if (error) return <div className="text-destructive p-4 text-sm">エラー: {error}</div>
  if (!data) return null

  if (!data.has_data) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            分析データがまだありません
          </CardTitle>
          <CardDescription>
            Gmail / Calendar 連携が無効か、名刺の最終接触日が未設定です。連携後、過去に頻繁に連絡していたが最近やり取りが途絶えている企業がここに自動で出てきます。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const items = filter === "all" ? data.items : data.items.filter(i => i.severity === filter)

  return (
    <div className="space-y-4">
      {/* サマリ */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label={`全 ${data.items.length} 件`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip label={`🔴 重要 ${data.summary.red}`} active={filter === "red"} onClick={() => setFilter("red")} />
        <FilterChip label={`🟡 注意 ${data.summary.yellow}`} active={filter === "yellow"} onClick={() => setFilter("yellow")} />
        <FilterChip label={`⚪ 弱 ${data.summary.gray}`} active={filter === "gray"} onClick={() => setFilter("gray")} />
        {data.fallback === "last_contacted_at" && (
          <Badge variant="outline" className="ml-auto text-xs text-amber-700 border-amber-500/40">
            Gmail 連携未設定。名刺の最終接触日で暫定表示中
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>営業機会創出すべき企業/コンタクト</CardTitle>
          <CardDescription>過去頻繁に連絡があったが、最近やり取りが途絶えている相手</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 w-10">深刻度</th>
                  <th className="py-2">担当者</th>
                  <th className="py-2">会社</th>
                  <th className="py-2 text-right">経過日数</th>
                  <th className="py-2 text-right">90日</th>
                  <th className="py-2 text-right">365日</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    className="border-b border-border/40 hover:bg-accent/40 cursor-pointer"
                    onClick={() => item.business_card_id && onCardClick?.(item.business_card_id)}
                  >
                    <td className="py-2">
                      {item.severity === "red" && <span className="text-red-500">🔴</span>}
                      {item.severity === "yellow" && <span className="text-amber-500">🟡</span>}
                      {item.severity === "gray" && <span className="text-muted-foreground">⚪</span>}
                    </td>
                    <td className="py-2">
                      <div>{item.contact_name || item.contact_email}</div>
                      {item.contact_name && <div className="text-xs text-muted-foreground">{item.contact_email}</div>}
                    </td>
                    <td className="py-2">{item.company_name || "—"}</td>
                    <td className="py-2 text-right tabular-nums">{item.days_since_last !== null ? `${item.days_since_last} 日` : "—"}</td>
                    <td className="py-2 text-right tabular-nums">{item.message_count_90d}</td>
                    <td className="py-2 text-right tabular-nums">{item.message_count_365d}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">該当なし</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent/40"
      }`}
    >
      {label}
    </button>
  )
}
