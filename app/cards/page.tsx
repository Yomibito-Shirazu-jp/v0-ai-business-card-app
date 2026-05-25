"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  Star,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { BusinessCard } from "@/lib/supabase/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CardsListPage() {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (debounced) params.set("search", debounced)
    params.set("limit", "200")
    return `/api/business-cards?${params.toString()}`
  }, [debounced])

  const { data, isLoading, error } = useSWR<{
    success: boolean
    data: BusinessCard[]
    count: number
  }>(apiUrl, fetcher, { revalidateOnFocus: false })

  const cards = data?.data ?? []

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button asChild size="icon" variant="ghost" className="md:hidden">
            <Link href="/" aria-label="ダッシュボードに戻る">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="flex-1 truncate text-base font-semibold sm:text-lg">名刺一覧</h1>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/?view=scan">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">追加</span>
            </Link>
          </Button>
        </div>
        <div className="border-t border-border bg-card/50 px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="名前・会社名・メールで検索"
                className="h-10 pl-9 text-base"
                autoComplete="off"
              />
            </div>
            <Badge variant="secondary" className="hidden h-9 items-center px-3 sm:inline-flex">
              {cards.length}件
            </Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-4">
        {error && (
          <Card className="p-4 text-sm text-destructive">読み込みに失敗しました。再読み込みしてください。</Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        )}

        {!isLoading && cards.length === 0 && !error && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">該当する名刺がありません</p>
            <p className="text-sm text-muted-foreground">右上の「追加」から登録できます。</p>
          </Card>
        )}

        <ul className="space-y-2 sm:space-y-3">
          {cards.map((c) => {
            const name = c.name || c.full_name || "(名前なし)"
            const company = c.company_name || ""
            return (
              <li key={c.id}>
                <Link
                  href={`/cards/${c.id}`}
                  className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40 active:bg-accent/60 sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 flex-shrink-0 sm:h-12 sm:w-12">
                      <AvatarImage src={c.image_url ?? undefined} alt={name} />
                      <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold sm:text-base">{name}</p>
                        {c.is_favorite && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-yellow-400 text-yellow-400" />}
                      </div>
                      {(company || c.position || c.department) && (
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {[company, c.department, c.position].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:text-xs">
                        {c.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </span>
                        )}
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {c.phone}
                          </span>
                        )}
                      </div>
                      {Array.isArray(c.tags) && c.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((t: string) => (
                            <Badge key={t} variant="outline" className="h-4 px-1.5 text-[10px]">
                              {t}
                            </Badge>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{c.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
