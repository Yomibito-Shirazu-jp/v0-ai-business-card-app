"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Printer, RotateCcw } from "lucide-react"

interface DesignData {
  display_name?: string
  display_name_kana?: string
  department?: string
  position?: string
  email?: string
  phone?: string
  mobile?: string
  fax?: string
  company_name?: string
  postal_code?: string
  address?: string
  website?: string
  logo_url?: string
  template_id?: string
  background_color?: string
  text_color?: string
}

const TEMPLATES = [
  { id: "classic", name: "クラシック" },
  { id: "modern",  name: "モダン" },
  { id: "minimal", name: "ミニマル" },
]

export function MyCardDesigner() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [data, setData] = useState<DesignData>({
    template_id: "modern",
    background_color: "#0f172a",
    text_color: "#f8fafc",
  })

  // 発注ダイアログ
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderQty, setOrderQty] = useState(100)
  const [paperType, setPaperType] = useState("マットコート 220kg")
  const [finish, setFinish] = useState("マットPP")

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/my-card", { cache: "no-store" })
        const j = await res.json()
        if (j.design) setData({ ...j.design })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function field<K extends keyof DesignData>(key: K, value: DesignData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch("/api/my-card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "保存失敗")
      setToast("保存しました")
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function placeOrder() {
    setSaving(true); setError(null)
    try {
      // 念のため事前保存
      await fetch("/api/my-card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const res = await fetch("/api/print-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_type: paperType,
          finish,
          items: [{ quantity: orderQty }],
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "発注失敗")
      setOrderOpen(false)
      setToast(`発注しました (${orderQty} 枚)。`)
      setTimeout(() => setToast(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-8"><Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...</div>
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      {/* プレビュー */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プレビュー (91 × 55 mm)</CardTitle>
            <CardDescription>右側で編集するとリアルタイムに反映されます。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/40 rounded-lg p-6 flex justify-center">
              <CardPreview data={data} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">操作</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              デザインを保存
            </Button>
            <Button variant="default" onClick={() => setOrderOpen(true)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Printer className="w-4 h-4" /> このデザインで発注する
            </Button>
            {toast && <span className="text-sm text-emerald-700 self-center">{toast}</span>}
            {error && <span className="text-sm text-destructive self-center">{error}</span>}
          </CardContent>
        </Card>
      </div>

      {/* 編集パネル */}
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">編集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <Label>テンプレート</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => field("template_id", t.id)}
                  className={`text-xs py-2 rounded border ${data.template_id === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"}`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>背景色</Label>
              <input type="color" value={data.background_color || "#0f172a"} onChange={(e) => field("background_color", e.target.value)} className="w-full h-9 rounded border border-border bg-transparent" />
            </div>
            <div>
              <Label>文字色</Label>
              <input type="color" value={data.text_color || "#f8fafc"} onChange={(e) => field("text_color", e.target.value)} className="w-full h-9 rounded border border-border bg-transparent" />
            </div>
          </div>

          <Section title="氏名">
            <Row><Label>氏名</Label><Input value={data.display_name || ""} onChange={(e) => field("display_name", e.target.value)} /></Row>
            <Row><Label>ふりがな</Label><Input value={data.display_name_kana || ""} onChange={(e) => field("display_name_kana", e.target.value)} /></Row>
          </Section>

          <Section title="会社">
            <Row><Label>会社名</Label><Input value={data.company_name || ""} onChange={(e) => field("company_name", e.target.value)} /></Row>
            <Row><Label>部署</Label><Input value={data.department || ""} onChange={(e) => field("department", e.target.value)} /></Row>
            <Row><Label>役職</Label><Input value={data.position || ""} onChange={(e) => field("position", e.target.value)} /></Row>
            <Row><Label>ロゴ画像 URL</Label><Input value={data.logo_url || ""} onChange={(e) => field("logo_url", e.target.value)} placeholder="https://..." /></Row>
          </Section>

          <Section title="連絡先">
            <Row><Label>メール</Label><Input value={data.email || ""} onChange={(e) => field("email", e.target.value)} /></Row>
            <Row><Label>電話</Label><Input value={data.phone || ""} onChange={(e) => field("phone", e.target.value)} /></Row>
            <Row><Label>携帯</Label><Input value={data.mobile || ""} onChange={(e) => field("mobile", e.target.value)} /></Row>
            <Row><Label>FAX</Label><Input value={data.fax || ""} onChange={(e) => field("fax", e.target.value)} /></Row>
            <Row><Label>Web</Label><Input value={data.website || ""} onChange={(e) => field("website", e.target.value)} /></Row>
          </Section>

          <Section title="住所">
            <Row><Label>郵便番号</Label><Input value={data.postal_code || ""} onChange={(e) => field("postal_code", e.target.value)} placeholder="123-4567" /></Row>
            <Row><Label>住所</Label><Input value={data.address || ""} onChange={(e) => field("address", e.target.value)} /></Row>
          </Section>
        </CardContent>
      </Card>

      {orderOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4" onClick={() => setOrderOpen(false)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>このデザインで発注</CardTitle>
              <CardDescription>名刺Plus は印刷発注の継続が利用条件です。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row><Label>枚数</Label>
                <select className="border border-border rounded-md bg-background px-3 h-9" value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value))}>
                  {[100, 200, 500, 1000].map(n => <option key={n} value={n}>{n} 枚</option>)}
                </select>
              </Row>
              <Row><Label>用紙</Label>
                <select className="border border-border rounded-md bg-background px-3 h-9" value={paperType} onChange={(e) => setPaperType(e.target.value)}>
                  <option>マットコート 220kg</option>
                  <option>ヴァンヌーボ 215kg</option>
                  <option>クラフト 200kg</option>
                </select>
              </Row>
              <Row><Label>仕上げ</Label>
                <select className="border border-border rounded-md bg-background px-3 h-9" value={finish} onChange={(e) => setFinish(e.target.value)}>
                  <option>マットPP</option>
                  <option>グロスPP</option>
                  <option>なし</option>
                </select>
              </Row>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOrderOpen(false)} disabled={saving}>キャンセル</Button>
                <Button onClick={placeOrder} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  発注する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-2 border-t border-border first:border-0 first:pt-0">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
      {children}
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[80px_1fr] items-center gap-2">{children}</div>
}

function CardPreview({ data }: { data: DesignData }) {
  // 名刺サイズ 91x55mm を 3.6x にして 327.6x198px
  const W = 410, H = 248
  const bg = data.background_color || "#0f172a"
  const fg = data.text_color || "#f8fafc"
  const muted = "rgba(255,255,255,0.6)"
  const accent = "#3b82f6"

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="rounded-md shadow-lg" style={{ background: bg }}>
      {data.template_id === "minimal" && (
        <>
          <text x="32" y="60" fill={fg} fontSize="22" fontWeight="700">{data.display_name || "山田 太郎"}</text>
          {data.display_name_kana && <text x="32" y="80" fill={muted} fontSize="10">{data.display_name_kana}</text>}
          {data.company_name && <text x="32" y="110" fill={muted} fontSize="11">{data.company_name}</text>}
          {data.department && <text x="32" y="125" fill={muted} fontSize="10">{data.department}{data.position ? ` / ${data.position}` : ""}</text>}
          <line x1="32" y1="155" x2="200" y2="155" stroke={accent} strokeWidth="1" />
          {data.email && <text x="32" y="180" fill={fg} fontSize="10">✉ {data.email}</text>}
          {data.phone && <text x="32" y="195" fill={fg} fontSize="10">☎ {data.phone}</text>}
          {data.mobile && <text x="32" y="210" fill={fg} fontSize="10">📱 {data.mobile}</text>}
          {data.address && <text x="32" y="225" fill={muted} fontSize="9">{data.postal_code ? `〒${data.postal_code} ` : ""}{data.address}</text>}
        </>
      )}
      {(!data.template_id || data.template_id === "modern") && (
        <>
          <rect x="0" y="0" width="6" height={H} fill={accent} />
          {data.logo_url && <image href={data.logo_url} x={W - 80} y={20} width={60} height={60} preserveAspectRatio="xMidYMid meet" />}
          <text x="32" y="80" fill={fg} fontSize="24" fontWeight="700">{data.display_name || "山田 太郎"}</text>
          {data.display_name_kana && <text x="32" y="100" fill={muted} fontSize="10">{data.display_name_kana}</text>}
          {data.company_name && <text x="32" y="128" fill={fg} fontSize="13" fontWeight="600">{data.company_name}</text>}
          {(data.department || data.position) && <text x="32" y="146" fill={muted} fontSize="10">{[data.department, data.position].filter(Boolean).join(" / ")}</text>}
          <line x1="32" y1="168" x2={W - 32} y2="168" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          {data.email && <text x="32" y="190" fill={fg} fontSize="10">✉ {data.email}</text>}
          {data.phone && <text x="32" y="205" fill={fg} fontSize="10">☎ {data.phone}</text>}
          {data.mobile && <text x="180" y="205" fill={fg} fontSize="10">📱 {data.mobile}</text>}
          {data.website && <text x="32" y="220" fill={muted} fontSize="9">🌐 {data.website}</text>}
          {data.address && <text x="32" y="235" fill={muted} fontSize="9">{data.postal_code ? `〒${data.postal_code} ` : ""}{data.address}</text>}
        </>
      )}
      {data.template_id === "classic" && (
        <>
          {data.logo_url && <image href={data.logo_url} x="28" y="20" width="50" height="50" preserveAspectRatio="xMidYMid meet" />}
          {data.company_name && <text x={data.logo_url ? 90 : 32} y="55" fill={fg} fontSize="13" fontWeight="600">{data.company_name}</text>}
          {data.department && <text x={data.logo_url ? 90 : 32} y="72" fill={muted} fontSize="10">{data.department}</text>}
          <line x1="28" y1="88" x2={W - 28} y2="88" stroke={accent} strokeWidth="0.6" />
          <text x="28" y="125" fill={muted} fontSize="10">{data.position || "Position"}</text>
          <text x="28" y="156" fill={fg} fontSize="26" fontWeight="700">{data.display_name || "山田 太郎"}</text>
          {data.display_name_kana && <text x="28" y="172" fill={muted} fontSize="9">{data.display_name_kana}</text>}
          {data.address && <text x={W - 28} y="200" fill={muted} fontSize="8" textAnchor="end">{data.postal_code ? `〒${data.postal_code} ` : ""}{data.address}</text>}
          {data.phone && <text x={W - 28} y="215" fill={fg} fontSize="9" textAnchor="end">TEL {data.phone}</text>}
          {data.mobile && <text x={W - 28} y="228" fill={fg} fontSize="9" textAnchor="end">携帯 {data.mobile}</text>}
          {data.email && <text x={W - 28} y="241" fill={fg} fontSize="9" textAnchor="end">{data.email}</text>}
        </>
      )}
    </svg>
  )
}
