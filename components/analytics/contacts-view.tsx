"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Inbox } from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"

interface CompanySummary {
  company_name: string | null
  msgs_30d: number
  msgs_90d: number
  msgs_365d: number
  unique_contacts: number
}

interface EmployeeBreakdown {
  id: string
  name: string
  msgs_30d: number
  msgs_90d: number
}

interface ContactsData {
  has_data: boolean
  top_companies: CompanySummary[]
  employee_breakdown: EmployeeBreakdown[]
}

export function ContactsView() {
  const [data, setData] = useState<ContactsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics/contacts", { cache: "no-store" })
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
            <Inbox className="w-5 h-5" />
            Gmail / Calendar 連携が未設定です
          </CardTitle>
          <CardDescription>
            連絡頻度を集計するには、社員が Google 連携を許可してメール・カレンダーの読み取りを有効化する必要があります。連携後、夜間バッチで contact_activity が埋まり次第ここに表示されます。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 企業別ランキング (直近 90 日) */}
      <Card>
        <CardHeader>
          <CardTitle>顧客企業の連絡頻度 (直近 90 日)</CardTitle>
          <CardDescription>Gmail / Calendar から自動集計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_companies.slice(0, 20)} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="company_name" tick={{ fontSize: 11 }} width={180} />
                <Tooltip />
                <Bar dataKey="msgs_90d" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 担当社員 */}
      <Card>
        <CardHeader>
          <CardTitle>担当社員別の連絡量</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">社員</th>
                  <th className="py-2 text-right">直近 30 日</th>
                  <th className="py-2 text-right">直近 90 日</th>
                </tr>
              </thead>
              <tbody>
                {data.employee_breakdown.map(emp => (
                  <tr key={emp.id} className="border-b border-border/40">
                    <td className="py-2">{emp.name}</td>
                    <td className="py-2 text-right tabular-nums">{emp.msgs_30d.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{emp.msgs_90d.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
