"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, Users, Star, Building2, MessageSquare, TrendingUp } from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart,
} from "recharts"
import { GmailSyncButton } from "./gmail-sync-button"

interface OverviewData {
  kpi: {
    totalCards: number
    favoriteCards: number
    thisMonthCards: number
    uniqueCompanies: number
    activeEmployees: number
    recentContactCount: number
    keyPerson: { name: string; company: string | null; score: number } | null
  }
  topTags: { name: string; count: number }[]
  topCompanies: { name: string; count: number }[]
  dailyTimeline: { date: string; count: number }[]
  monthlyTimeline: { month: string; count: number }[]
  hasContactActivity: boolean
}

export function OverviewView() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics/overview", { cache: "no-store" })
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
  if (error) {
    return <div className="text-destructive p-4 text-sm">エラー: {error}</div>
  }
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Briefcase className="w-4 h-4" />} label="名刺総数" value={data.kpi.totalCards.toLocaleString()} />
        <KpiCard icon={<Star className="w-4 h-4" />} label="お気に入り" value={data.kpi.favoriteCards.toLocaleString()} />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="今月の新規" value={data.kpi.thisMonthCards.toLocaleString()} />
        <KpiCard icon={<Building2 className="w-4 h-4" />} label="会社数" value={data.kpi.uniqueCompanies.toLocaleString()} />
        <KpiCard icon={<Users className="w-4 h-4" />} label="アクティブ社員" value={data.kpi.activeEmployees.toLocaleString()} />
        <KpiCard icon={<MessageSquare className="w-4 h-4" />} label="直近30日連絡" value={data.kpi.recentContactCount.toLocaleString()} />
      </div>

      {/* Key person */}
      {data.kpi.keyPerson && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>キーパーソン (直近90日のメッセージ数 No.1)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{data.kpi.keyPerson.name}</div>
            <div className="text-sm text-muted-foreground">
              {data.kpi.keyPerson.company || "—"} ・ {data.kpi.keyPerson.score} 通
            </div>
          </CardContent>
        </Card>
      )}

      {!data.hasContactActivity && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700 mb-3">
              Gmail を同期すると、各名刺との実際のメッセージ頻度を分析できるようになります。
            </p>
            <GmailSyncButton onSyncComplete={() => window.location.reload()} />
          </CardContent>
        </Card>
      )}

      {/* 月次推移 */}
      <Card>
        <CardHeader>
          <CardTitle>名刺登録の月次推移 (直近12ヶ月)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 上位企業 */}
      <Card>
        <CardHeader>
          <CardTitle>名刺数 上位企業 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCompanies} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))">
                  {data.topCompanies.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 12} 80% ${55 - i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* タグ */}
      {data.topTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>頻出タグ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topTags.map(t => (
                <Badge key={t.name} variant="secondary">
                  {t.name} <span className="ml-1 opacity-70">{t.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
