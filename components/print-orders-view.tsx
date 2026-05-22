"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Truck } from "lucide-react"

type OrderItem = { id: string; design_id: string | null; employee_id: string; quantity: number; unit_price: number; subtotal: number }
type Order = {
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
  print_order_items: OrderItem[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: '受付待ち',
  confirmed: '確定',
  in_production: '製造中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

export function PrintOrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // フォーム
  const [paperType, setPaperType] = useState('standard')
  const [finish, setFinish] = useState('matte')
  const [quantity, setQuantity] = useState(100)
  const [unitPrice, setUnitPrice] = useState(20)
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/print-orders')
      const json = await res.json()
      if (res.ok) setOrders(json.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const onCreate = async () => {
    if (quantity <= 0 || unitPrice < 0) {
      setMessage('数量・単価を確認してください')
      return
    }
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/print-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_type: paperType,
          finish,
          shipping_address: shippingAddress || null,
          notes: notes || null,
          items: [{ quantity, unit_price: unitPrice }],
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '注文作成に失敗しました')
      setMessage('注文を作成しました')
      setQuantity(100)
      setNotes('')
      await fetchOrders()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '注文作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />新規注文</CardTitle>
          <CardDescription>自分の現在の名刺デザインで注文します</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm">用紙</Label>
            <select value={paperType} onChange={(e) => setPaperType(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="standard">標準</option>
              <option value="premium">高品質</option>
              <option value="recycled">再生紙</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">仕上げ</Label>
            <select value={finish} onChange={(e) => setFinish(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="matte">マット</option>
              <option value="glossy">光沢</option>
              <option value="uv">UV加工</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">数量</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">単価（円）</Label>
            <Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-sm">配送先住所</Label>
            <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="〒000-0000 ..." />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-sm">備考</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button onClick={onCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              注文する（合計 {(quantity * unitPrice).toLocaleString()} 円）
            </Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />注文履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-6">読み込み中...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">注文はまだありません。</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const totalQty = (o.print_order_items || []).reduce((s, it) => s + it.quantity, 0)
                return (
                  <div key={o.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge>{STATUS_LABEL[o.status] || o.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div><span className="text-muted-foreground">数量:</span> {totalQty}</div>
                      <div><span className="text-muted-foreground">用紙:</span> {o.paper_type}</div>
                      <div><span className="text-muted-foreground">仕上げ:</span> {o.finish}</div>
                      <div><span className="text-muted-foreground">合計:</span> {o.total_cost != null ? `${Number(o.total_cost).toLocaleString()}円` : '-'}</div>
                    </div>
                    {o.tracking_number && (
                      <div className="text-xs text-muted-foreground">追跡: {o.tracking_number}</div>
                    )}
                    {o.shipping_address && (
                      <div className="text-xs text-muted-foreground truncate">配送先: {o.shipping_address}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
