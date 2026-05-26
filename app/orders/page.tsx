"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Receipt, CreditCard, Package, AlertTriangle, Search, ExternalLink } from "lucide-react"

interface OrderItem {
  id: string
  status: string
  paper_type: string
  finish: string
  notes: string | null
  shipping_address: string | null
  ordered_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  tracking_number: string | null
  total_cost: number | null
  created_at: string
  quantity: number
  orderer: { id: string; display_name: string | null; email: string } | null
  payments: PaymentItem[]
  payment_summary: {
    succeeded_amount: number
    refunded_amount: number
    balance_due: number
    latest_status: string
  }
}
interface PaymentItem {
  id: string
  amount: number
  currency: string
  status: string
  payment_method: string | null
  card_brand: string | null
  card_last4: string | null
  provider: string
  receipt_url: string | null
  paid_at: string | null
  refunded_at: string | null
  created_at: string
  failure_reason: string | null
}

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  draft:      { label: "下書き", color: "bg-slate-500" },
  ordered:    { label: "受注", color: "bg-blue-500" },
  confirmed:  { label: "確定", color: "bg-blue-600" },
  production: { label: "印刷中", color: "bg-amber-500" },
  shipped:    { label: "発送済", color: "bg-emerald-500" },
  delivered:  { label: "配達完了", color: "bg-emerald-600" },
  cancelled:  { label: "キャンセル", color: "bg-red-500" },
}
const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "未決済", color: "bg-slate-500" },
  processing: { label: "処理中", color: "bg-amber-500" },
  succeeded:  { label: "支払済", color: "bg-emerald-600" },
  failed:     { label: "失敗", color: "bg-red-500" },
  refunded:   { label: "返金済", color: "bg-amber-600" },
  partially_refunded: { label: "一部返金", color: "bg-amber-500" },
  cancelled:  { label: "キャンセル", color: "bg-slate-500" },
}

export default function OrdersPage() {
  const [items, setItems] = useState<OrderItem[]>([])
  const [kpi, setKpi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all")
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || "取得失敗")
        setItems(j.items || [])
        setKpi(j.kpi)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = items.filter(i => {
    if (filter === "unpaid" && i.payment_summary.balance_due === 0) return false
    if (filter === "paid" && i.payment_summary.balance_due > 0) return false
    if (query) {
      const q = query.toLowerCase()
      const hay = `${i.orderer?.display_name || ""} ${i.orderer?.email || ""} ${i.tracking_number || ""} ${i.paper_type} ${i.finish}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-card gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← ホーム</Link>
        <Receipt className="w-5 h-5 text-primary ml-2" />
        <h1 className="font-semibold">発注・決済履歴</h1>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* KPI */}
        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi icon={<Package className="w-4 h-4" />} label="発注総数" value={kpi.total_orders.toLocaleString()} />
            <Kpi icon={<Package className="w-4 h-4" />} label="名刺総枚数" value={`${kpi.total_quantity.toLocaleString()} 枚`} />
            <Kpi icon={<CreditCard className="w-4 h-4" />} label="支払済" value={`¥${kpi.paid_amount.toLocaleString()}`} />
            <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="未払い残" value={`¥${kpi.unpaid_amount.toLocaleString()}`} color={kpi.unpaid_amount > 0 ? "text-amber-600" : ""} />
            <Kpi icon={<Receipt className="w-4 h-4" />} label="30日売上" value={`¥${kpi.last30d_amount.toLocaleString()}`} />
          </div>
        )}

        {/* フィルタ */}
        <Card>
          <CardContent className="pt-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="発注者名・追跡番号で検索..." className="pl-9" />
            </div>
            <div className="flex gap-1">
              <Chip label={`全て (${items.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
              <Chip label={`未払い`} active={filter === "unpaid"} onClick={() => setFilter("unpaid")} />
              <Chip label={`支払済`} active={filter === "paid"} onClick={() => setFilter("paid")} />
            </div>
          </CardContent>
        </Card>

        {/* 一覧 */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-8"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">該当する発注はありません</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const ost = ORDER_STATUS[o.status] || { label: o.status, color: "bg-slate-500" }
              const pst = PAY_STATUS[o.payment_summary.latest_status] || { label: o.payment_summary.latest_status, color: "bg-slate-500" }
              const isOpen = openId === o.id
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpenId(isOpen ? null : o.id)}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">
                          #{o.id.slice(0, 8)} — {o.quantity} 枚 / {o.paper_type} / {o.finish}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {o.orderer?.display_name || o.orderer?.email || "—"} •{" "}
                          {new Date(o.created_at).toLocaleString("ja-JP")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${ost.color} hover:${ost.color} text-white`}>{ost.label}</Badge>
                        <Badge className={`${pst.color} hover:${pst.color} text-white`}>{pst.label}</Badge>
                        <span className="font-semibold tabular-nums">¥{Number(o.total_cost || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="space-y-3 text-sm border-t border-border pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Info label="発注日">{o.ordered_at ? new Date(o.ordered_at).toLocaleString("ja-JP") : "—"}</Info>
                        <Info label="発送日">{o.shipped_at ? new Date(o.shipped_at).toLocaleString("ja-JP") : "—"}</Info>
                        <Info label="配達日">{o.delivered_at ? new Date(o.delivered_at).toLocaleString("ja-JP") : "—"}</Info>
                        <Info label="追跡番号">{o.tracking_number || "—"}</Info>
                      </div>
                      {o.shipping_address && <Info label="配送先">{o.shipping_address}</Info>}

                      {/* 決済履歴 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">決済履歴 ({o.payments.length} 件)</div>
                        {o.payments.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">決済情報はまだありません。</p>
                        ) : (
                          <div className="space-y-1.5">
                            {o.payments.map(p => {
                              const ps = PAY_STATUS[p.status] || { label: p.status, color: "bg-slate-500" }
                              return (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded border border-border bg-card/40 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${ps.color} hover:${ps.color} text-white text-[10px]`}>{ps.label}</Badge>
                                    <span className="tabular-nums">¥{Number(p.amount).toLocaleString()}</span>
                                    {p.tax_amount > 0 && <span className="text-muted-foreground">(内税 ¥{Number(p.tax_amount).toLocaleString()})</span>}
                                    {p.payment_method === "card" && p.card_brand && (
                                      <span className="text-muted-foreground">{p.card_brand.toUpperCase()} •••• {p.card_last4}</span>
                                    )}
                                    {p.payment_method && p.payment_method !== "card" && (
                                      <span className="text-muted-foreground">{p.payment_method === "bank_transfer" ? "銀行振込" : p.payment_method === "invoice" ? "請求書払い" : p.payment_method}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span>{p.paid_at ? new Date(p.paid_at).toLocaleDateString("ja-JP") : new Date(p.created_at).toLocaleDateString("ja-JP")}</span>
                                    {p.receipt_url && (
                                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                        領収書<ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {o.payment_summary.balance_due > 0 && (
                          <p className="text-xs text-amber-700 mt-1">
                            未払い残: ¥{o.payment_summary.balance_due.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
        <div className={`text-xl font-semibold tabular-nums ${color || ""}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent/40"}`}>
      {label}
    </button>
  )
}
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}
