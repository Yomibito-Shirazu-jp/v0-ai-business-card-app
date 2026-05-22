"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Loader2 } from "lucide-react"

type Design = {
  employee_id: string
  company_id: string
  display_name: string
  display_name_kana: string
  department: string
  position: string
  email: string
  phone: string
  mobile: string
  fax: string
  company_name: string
  postal_code: string
  address: string
  website: string
  logo_url: string
  photo_url: string
  qr_code_data: string
  template_id: string
  background_color: string
  text_color: string
  notes: string
}

export function MyCardView() {
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/my-card')
        const json = await res.json()
        if (active && res.ok) setDesign(json.design)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const onChange = (k: keyof Design, v: string) => {
    setDesign((d) => (d ? { ...d, [k]: v } : d))
  }

  const onSave = async () => {
    if (!design) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/my-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '保存に失敗しました')
      setMessage('保存しました')
      if (json.design) setDesign((d) => (d ? { ...d, ...json.design } : json.design))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />読み込み中...</div>
  if (!design) return <p className="text-muted-foreground">データが取得できませんでした。</p>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>プレビュー</CardTitle>
          <CardDescription>標準テンプレートでのレイアウト</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="mx-auto rounded-lg shadow-sm border p-6"
            style={{
              backgroundColor: design.background_color || '#ffffff',
              color: design.text_color || '#111111',
              width: '100%',
              maxWidth: 480,
              aspectRatio: '91 / 55',
            }}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-sm opacity-80">{design.company_name || '会社名'}</p>
                <p className="text-xl font-bold mt-1">{design.display_name || '氏名'}</p>
                <p className="text-xs opacity-70">{design.display_name_kana}</p>
                <p className="text-xs mt-1">{[design.department, design.position].filter(Boolean).join(' / ') || '部署 / 役職'}</p>
              </div>
              <div className="text-xs space-y-0.5">
                {design.email && <p>{design.email}</p>}
                {design.phone && <p>TEL: {design.phone}</p>}
                {design.mobile && <p>MOBILE: {design.mobile}</p>}
                {design.address && <p>{design.address}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>編集</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="会社名" value={design.company_name} onChange={(v) => onChange('company_name', v)} />
          <Field label="氏名" value={design.display_name} onChange={(v) => onChange('display_name', v)} />
          <Field label="氏名（カナ）" value={design.display_name_kana} onChange={(v) => onChange('display_name_kana', v)} />
          <Field label="部署" value={design.department} onChange={(v) => onChange('department', v)} />
          <Field label="役職" value={design.position} onChange={(v) => onChange('position', v)} />
          <Field label="メール" value={design.email} onChange={(v) => onChange('email', v)} />
          <Field label="電話" value={design.phone} onChange={(v) => onChange('phone', v)} />
          <Field label="携帯" value={design.mobile} onChange={(v) => onChange('mobile', v)} />
          <Field label="FAX" value={design.fax} onChange={(v) => onChange('fax', v)} />
          <Field label="郵便番号" value={design.postal_code} onChange={(v) => onChange('postal_code', v)} />
          <div className="md:col-span-2">
            <Field label="住所" value={design.address} onChange={(v) => onChange('address', v)} />
          </div>
          <Field label="WEB" value={design.website} onChange={(v) => onChange('website', v)} />
          <Field label="QRコード内容(URL等)" value={design.qr_code_data} onChange={(v) => onChange('qr_code_data', v)} />
          <Field label="背景色" type="color" value={design.background_color || '#ffffff'} onChange={(v) => onChange('background_color', v)} />
          <Field label="文字色" type="color" value={design.text_color || '#111111'} onChange={(v) => onChange('text_color', v)} />
          <div className="md:col-span-2">
            <Label className="text-sm">備考</Label>
            <Textarea value={design.notes || ''} onChange={(e) => onChange('notes', e.target.value)} rows={3} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              保存
            </Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
