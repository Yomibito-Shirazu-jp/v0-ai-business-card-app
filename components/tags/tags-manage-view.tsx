"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Pencil, Trash2, Merge, RefreshCw, Search } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

interface TagItem { name: string; count: number }
interface Kpi { totalTags: number; taggedCards: number; untaggedCards: number; lastUpdatedAt: string | null }

export function TagsManageView({ canEdit }: { canEdit: boolean }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [tags, setTags] = useState<TagItem[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [renameOpen, setRenameOpen] = useState<null | string>(null)
  const [renameValue, setRenameValue] = useState("")
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState("")
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tags", { cache: "no-store" })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      setKpi(j.kpi)
      setTags(j.tags || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleSelect(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function doRename(oldName: string, newName: string) {
    if (!newName.trim() || newName.trim() === oldName) {
      setRenameOpen(null)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(oldName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_name: newName.trim() }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || "rename failed")
      setToast(`「${oldName}」を「${newName.trim()}」にリネーム (${j.updated} 件更新)`)
      setRenameOpen(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function doDelete(name: string) {
    if (!confirm(`タグ「${name}」を全ての名刺から削除します。よろしいですか？`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || "delete failed")
      setToast(`「${name}」を ${j.removed_from} 件の名刺から削除`)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function doMerge() {
    const sources = Array.from(selected)
    if (sources.length < 2) { alert("2 つ以上選んでください"); return }
    if (!mergeTarget.trim()) { alert("統合先のタグ名を入力してください"); return }
    setBusy(true)
    try {
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, target: mergeTarget.trim() }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || "merge failed")
      setToast(`${sources.length} 個のタグを「${mergeTarget.trim()}」に統合 (${j.updated} 件)`)
      setMergeOpen(false)
      setMergeTarget("")
      setSelected(new Set())
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const filtered = query.trim().length === 0
    ? tags
    : tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="タグ総数" value={kpi?.totalTags ?? 0} />
        <Kpi label="タグ付き名刺" value={kpi?.taggedCards ?? 0} />
        <Kpi label="未タグ" value={kpi?.untaggedCards ?? 0} />
        <Kpi label="最終更新" value={kpi?.lastUpdatedAt ? new Date(kpi.lastUpdatedAt).toLocaleDateString("ja-JP") : "—"} small />
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">タグ一覧</CardTitle>
              <CardDescription>クリックで選択。複数選んで統合できます。</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={load} className="gap-1">
                <RefreshCw className="w-4 h-4" /> 再読込
              </Button>
              {canEdit && selected.size >= 2 && (
                <Button size="sm" onClick={() => setMergeOpen(true)} className="gap-1">
                  <Merge className="w-4 h-4" /> 統合 ({selected.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タグを検索..." className="pl-9" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...
            </div>
          ) : error ? (
            <div className="text-destructive text-sm p-3">{error}</div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">該当するタグがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map(t => {
                const isSelected = selected.has(t.name)
                return (
                  <div
                    key={t.name}
                    className={`group inline-flex items-center gap-1 px-2 py-1 rounded-md border text-sm cursor-pointer transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border hover:bg-accent/40"
                    }`}
                    onClick={() => toggleSelect(t.name)}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className={isSelected ? "opacity-80" : "text-muted-foreground"}>({t.count})</span>
                    {canEdit && (
                      <>
                        <button
                          className="ml-1 opacity-0 group-hover:opacity-100 hover:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenameOpen(t.name)
                            setRenameValue(t.name)
                          }}
                          title="リネーム"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            doDelete(t.name)
                          }}
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!canEdit && (
            <p className="text-xs text-amber-600 mt-3">タグの編集・削除・統合は管理者 (owner / admin) のみ可能です。</p>
          )}
        </CardContent>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameOpen !== null} onOpenChange={(o) => !o && setRenameOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>タグをリネーム</DialogTitle>
            <DialogDescription>
              「<strong>{renameOpen}</strong>」を別の名前に変えると、このタグが付いている全ての名刺で置換されます。
            </DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="新しいタグ名" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRenameOpen(null)} disabled={busy}>キャンセル</Button>
            <Button onClick={() => renameOpen && doRename(renameOpen, renameValue)} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "リネーム"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>タグを統合</DialogTitle>
            <DialogDescription>
              選択した {selected.size} 個のタグを 1 つに統合します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selected).map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
          <div className="space-y-1.5 pt-2">
            <label className="text-sm text-muted-foreground">統合先のタグ名</label>
            <Input value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} placeholder="例: 顧客" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMergeOpen(false)} disabled={busy}>キャンセル</Button>
            <Button onClick={doMerge} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "統合する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={small ? "text-base font-medium" : "text-2xl font-semibold tabular-nums"}>{value}</div>
      </CardContent>
    </Card>
  )
}
