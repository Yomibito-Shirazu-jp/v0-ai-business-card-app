"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Globe,
  Building2,
  Loader2,
  Trash2,
  Save,
  ExternalLink,
  Newspaper,
  Star,
  Sparkles,
  Wand2,
  Copy,
  Check,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import type { BusinessCard } from "@/lib/supabase/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type NewsItem = {
  title: string
  url: string
  published_at: string | null
  source: string
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: BusinessCard }>(
    `/api/business-cards/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  const card = data?.data
  const company = card?.company_name?.trim()

  const { data: newsRes } = useSWR<{ news: NewsItem[] }>(
    company ? `/api/company-news?company=${encodeURIComponent(company)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const { data: profileRes } = useSWR<{
    profile: {
      industry: string | null
      description: string | null
      hq_address: string | null
      website: string | null
      employee_size: string | null
      is_listed: boolean | null
      established: string | null
    } | null
    ai_unavailable?: boolean
  }>(company ? `/api/company-profile?company=${encodeURIComponent(company)}` : null, fetcher, {
    revalidateOnFocus: false,
  })

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<BusinessCard>>({})

  // --- AI 提案 ---
  type Suggestion = {
    email_subject: string
    email_body: string
    talking_points: string[]
    follow_up: string
  }
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [purpose, setPurpose] =
    useState<"first_contact" | "follow_up" | "sales">("first_contact")
  const [copied, setCopied] = useState<"subject" | "body" | null>(null)

  async function generateSuggestion() {
    setSuggesting(true)
    setSuggestion(null)
    try {
      const res = await fetch("/api/card-ai-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: id, purpose }),
      })
      const json = await res.json()
      if (!res.ok || !json.suggestion) {
        throw new Error(json.error || "生成に失敗しました")
      }
      setSuggestion(json.suggestion as Suggestion)
    } catch (e) {
      toast({
        title: "AI提案の生成に失敗しました",
        description: (e as Error).message,
        variant: "destructive",
      })
    } finally {
      setSuggesting(false)
    }
  }

  async function copyText(label: "subject" | "body", text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  function startEdit() {
    if (!card) return
    setForm({
      name: card.name ?? card.full_name ?? "",
      name_kana: card.name_kana ?? card.full_name_kana ?? "",
      company_name: card.company_name ?? "",
      department: card.department ?? "",
      position: card.position ?? "",
      email: card.email ?? "",
      phone: card.phone ?? "",
      mobile: card.mobile ?? "",
      address: card.address ?? "",
      website: card.website ?? "",
      notes: card.notes ?? "",
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/business-cards/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "保存に失敗しました")
      await mutate()
      setEditing(false)
      toast({ title: "保存しました" })
    } catch (e) {
      toast({ title: "保存に失敗しました", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function toggleFavorite() {
    if (!card) return
    const next = !card.is_favorite
    await fetch(`/api/business-cards/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_favorite: next }),
    })
    await mutate()
  }

  async function remove() {
    const res = await fetch(`/api/business-cards/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (!res.ok || !json.success) {
      toast({ title: "削除に失敗しました", description: json.error, variant: "destructive" })
      return
    }
    toast({ title: "削除しました" })
    router.push("/cards")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4">名刺が見つかりませんでした。</p>
        <Button asChild>
          <Link href="/cards">一覧に戻る</Link>
        </Button>
      </div>
    )
  }

  const name = card.name || card.full_name || "(名前なし)"
  const kana = card.name_kana || card.full_name_kana || ""
  const news = newsRes?.news ?? []
  const profile = profileRes?.profile ?? null

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Button asChild size="icon" variant="ghost">
            <Link href="/cards" aria-label="一覧に戻る">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="flex-1 truncate text-base font-semibold">{name}</h1>
          <Button size="icon" variant="ghost" onClick={toggleFavorite} aria-label="お気に入り">
            <Star className={`h-4 w-4 ${card.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={startEdit}>
              編集
            </Button>
          ) : (
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              保存
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={card.image_url ?? undefined} alt={name} />
              <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold leading-tight sm:text-2xl">{name}</p>
              {kana && <p className="text-xs text-muted-foreground">{kana}</p>}
              {card.company_name && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {card.company_name}
                </p>
              )}
              {(card.department || card.position) && (
                <p className="text-xs text-muted-foreground">
                  {[card.department, card.position].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </div>
          {Array.isArray(card.tags) && card.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.tags.map((t: string) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="info" className="mx-auto mt-3 max-w-3xl px-4">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">基本情報</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            <Wand2 className="mr-1 h-3 w-3" />AI提案
          </TabsTrigger>
          <TabsTrigger value="company" className="flex-1">
            <Sparkles className="mr-1 h-3 w-3" />会社
          </TabsTrigger>
          <TabsTrigger value="news" className="flex-1">
            <Newspaper className="mr-1 h-3 w-3" />ニュース
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3 pt-3">
          {!editing ? (
            <Card className="divide-y divide-border">
              <DetailRow icon={<Mail className="h-4 w-4" />} label="メール" value={card.email} href={card.email ? `mailto:${card.email}` : undefined} />
              <DetailRow icon={<Phone className="h-4 w-4" />} label="電話" value={card.phone} href={card.phone ? `tel:${card.phone}` : undefined} />
              <DetailRow icon={<Smartphone className="h-4 w-4" />} label="携帯" value={card.mobile} href={card.mobile ? `tel:${card.mobile}` : undefined} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="住所" value={card.address} />
              <DetailRow
                icon={<Globe className="h-4 w-4" />}
                label="Web"
                value={card.website}
                href={card.website ? (card.website.startsWith("http") ? card.website : `https://${card.website}`) : undefined}
                external
              />
              {card.notes && (
                <div className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">メモ</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{card.notes}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="space-y-3 p-4">
              <Field label="名前" value={form.name as string} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="ふりがな" value={form.name_kana as string} onChange={(v) => setForm({ ...form, name_kana: v })} />
              <Field label="会社名" value={form.company_name as string} onChange={(v) => setForm({ ...form, company_name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="部署" value={form.department as string} onChange={(v) => setForm({ ...form, department: v })} />
                <Field label="役職" value={form.position as string} onChange={(v) => setForm({ ...form, position: v })} />
              </div>
              <Field label="メール" type="email" value={form.email as string} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="電話" type="tel" value={form.phone as string} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="携帯" type="tel" value={form.mobile as string} onChange={(v) => setForm({ ...form, mobile: v })} />
              </div>
              <Field label="住所" value={form.address as string} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label="Webサイト" value={form.website as string} onChange={(v) => setForm({ ...form, website: v })} />
              <div>
                <Label className="text-xs">メモ</Label>
                <Textarea
                  value={(form.notes as string) ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </Card>
          )}

          <div className="flex justify-end pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="pt-3 space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4 text-primary" />
              AIに提案させる
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              会社情報・メモ・最新ニュースを踏まえ、初回メールや会話のきっかけを下書きします。
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  { v: "first_contact", l: "初回挨拶" },
                  { v: "follow_up", l: "フォロー" },
                  { v: "sales", l: "提案/営業" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.v}
                  type="button"
                  variant={purpose === opt.v ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setPurpose(opt.v)}
                >
                  {opt.l}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              className="mt-3 w-full"
              onClick={generateSuggestion}
              disabled={suggesting}
            >
              {suggesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AIが下書き中...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  下書きを生成
                </>
              )}
            </Button>
          </Card>

          {suggestion && (
            <>
              <Card className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">件名</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyText("subject", suggestion.email_subject)}
                  >
                    {copied === "subject" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-sm font-medium">{suggestion.email_subject}</p>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-medium text-muted-foreground">本文</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyText("body", suggestion.email_body)}
                  >
                    {copied === "body" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {suggestion.email_body}
                </p>
                {card.email && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full bg-transparent"
                  >
                    <a
                      href={`mailto:${card.email}?subject=${encodeURIComponent(
                        suggestion.email_subject,
                      )}&body=${encodeURIComponent(suggestion.email_body)}`}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      この内容でメールを開く
                    </a>
                  </Button>
                )}
              </Card>

              <Card className="space-y-2 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  会話アイスブレイク
                </p>
                <ul className="space-y-2">
                  {suggestion.talking_points.map((tp, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-snug">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-1 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  フォローアップ提案
                </p>
                <p className="text-sm leading-relaxed">{suggestion.follow_up}</p>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="company" className="pt-3">
          {!company ? (
            <Card className="p-4 text-sm text-muted-foreground">会社名が登録されていません</Card>
          ) : !profile ? (
            <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />会社情報を取得中...
            </Card>
          ) : (
            <Card className="space-y-2 p-4 text-sm">
              <KV k="業種" v={profile.industry} />
              <KV k="規模" v={profile.employee_size} />
              <KV k="設立" v={profile.established} />
              <KV k="上場" v={profile.is_listed === null ? null : profile.is_listed ? "上場" : "非上場"} />
              <KV k="本社" v={profile.hq_address} />
              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {profile.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {profile.description && (
                <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{profile.description}</p>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="news" className="pt-3">
          {!company ? (
            <Card className="p-4 text-sm text-muted-foreground">会社名が登録されていません</Card>
          ) : news.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              {newsRes ? "関連ニュースは見つかりませんでした" : "ニュースを取得中..."}
            </Card>
          ) : (
            <Card className="divide-y divide-border">
              {news.map((n) => (
                <a
                  key={n.url}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 transition-colors hover:bg-accent/40"
                >
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {n.source && <span className="truncate">{n.source}</span>}
                    {n.published_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(n.published_at).toLocaleDateString("ja-JP")}</span>
                      </>
                    )}
                    <ExternalLink className="ml-auto h-3 w-3 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}

function DetailRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  href?: string
  external?: boolean
}) {
  if (!value) return null
  const content = (
    <div className="flex items-center gap-3 p-4">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
      {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
    </div>
  )
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="block hover:bg-accent/40">
        {content}
      </a>
    )
  }
  return content
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-10" />
    </div>
  )
}

function KV({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 flex-shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  )
}
