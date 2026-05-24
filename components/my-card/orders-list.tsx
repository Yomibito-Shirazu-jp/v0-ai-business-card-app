"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface OrderItem {
  id: string
  status: string
  paper_type: string
  finish: string
  total_cost: number | null
  created_at: string
  ordered_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  tracking_number: string | null
  print_order_items: { quantity: number; unit_price: number; subtotal: number }[]
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:      { label: "下書き", color: "bg-slate-500" },
  ordered:    { label: "受注", color: "bg-blue-500" },
  confirmed:  { label: "確定", color: "bg-blue-600" },
  production: { label: "印刷中", color: "bg-amber-500" },
  shipped:    { label: "発送済", color: "bg-emerald-500" },
  delivered:  { label: "配達完了", color: "bg-emerald-600" },
  cancelled:  { label: "キャンセル", color: "bg-red-500" },
}

export function MyCardOrdersList() {
  const [items, setItems] = useState<OrderItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/print-orders", { cache: "no-store" })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || "取得失敗")
        setItems(j.items || [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [])
  if (err) return <p className="text-destructive text-sm">{err}</p>
  if (items === null) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>
  if (items.length === 0) return <p className="text-muted-foreground py-8 text-center">発注履歴がありません。「自分の名刺」タブからデザインして発注してください。</p>
  return (
    <div className="space-y-3">
      {items.map(o => {
        const st = STATUS_LABEL[o.status] || { label: o.status, color: "bg-slate-500" }
        const qty = (o.print_order_items || []).reduce((a, b) => a + (b.quantity || 0), 0)
        return (
          <Card key={o.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">発注 #{o.id.slice(0, 8)}</CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ja-JP")}</p>
              </div>
              <Badge className={`${st.color} hover:${st.color} text-white`}>{st.label}</Badge>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{qty} 枚 / {o.paper_type} / {o.finish}</div>
              {o.total_cost && <div className="text-muted-foreground">¥{o.total_cost.toLocaleString()}</div>}
              {o.tracking_number && <div className="text-xs text-muted-foreground">追跡番号: {o.tracking_number}</div>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
