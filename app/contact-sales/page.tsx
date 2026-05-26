"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, Briefcase } from "lucide-react"

export default function ContactSalesPage() {
  const params = useSearchParams()
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    employees_count: "",
    message: "",
  })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", content: "", term: "" })

  useEffect(() => {
    setUtm({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
    })
  }, [params])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setError(null)
    try {
      const res = await fetch("/api/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employees_count: form.employees_count ? Number(form.employees_count) : null,
          utm_source: utm.source,
          utm_medium: utm.medium,
          utm_campaign: utm.campaign,
          utm_content: utm.content,
          utm_term: utm.term,
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || "送信失敗")
      setDone(true)
      // Conversion event 発火
      if (typeof window !== "undefined") {
        ;(window as any).gtag?.("event", "conversion", { send_to: "GA4_CONTACT_SALES" })
        ;(window as any).fbq?.("track", "Lead")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setsending(false)
    }
  }
  function setsending(v: boolean) { setSending(v) }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle>ご連絡ありがとうございます</CardTitle>
            <CardDescription>営業担当より 2 営業日以内にご連絡します。</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <a href="https://demo.b-p.co.jp/" className="text-primary hover:underline">デモに戻る</a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-2">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">名刺Plus を本格利用する</h1>
          <p className="text-sm text-muted-foreground mt-1">
            月額 ¥1,950 で 名刺 50 枚も毎月お届け。下記フォームから営業へお問い合わせください。
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="company_name">会社名 *</Label>
                <Input id="company_name" required value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="株式会社○○" />
              </div>
              <div>
                <Label htmlFor="contact_name">ご担当者名 *</Label>
                <Input id="contact_name" required value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="山田 太郎" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">メール *</Label>
                  <Input id="email" type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="yamada@example.co.jp" />
                </div>
                <div>
                  <Label htmlFor="phone">電話番号</Label>
                  <Input id="phone" type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03-1234-5678" />
                </div>
              </div>
              <div>
                <Label htmlFor="employees_count">想定利用人数</Label>
                <Input id="employees_count" type="number" min={1} value={form.employees_count}
                  onChange={(e) => setForm({ ...form, employees_count: e.target.value })} placeholder="例: 10" />
              </div>
              <div>
                <Label htmlFor="message">ご質問・ご要望</Label>
                <Textarea id="message" rows={3} value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="(任意)" />
              </div>
              {error && (
                <div className="text-sm px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={sending} className="w-full gap-1 h-11">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                送信する
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                送信内容は本契約のご連絡以外には使用しません。
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
