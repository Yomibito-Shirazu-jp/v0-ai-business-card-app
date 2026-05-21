"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Users,
  Building2,
  Briefcase,
  Star,
} from "lucide-react"

// API レスポンス型（/api/analytics/network）
interface ApiNode {
  id: string
  type: "employee" | "business_card"
  label: string
  size: number
  color: string
  meta: Record<string, unknown>
}

interface ApiLink {
  source: string
  target: string
  type: "owner" | "company" | "email"
  strength: number
}

interface ApiResponse {
  nodes: ApiNode[]
  links: ApiLink[]
  stats: {
    nodes_total: number
    nodes_visible: number
    links_visible: number
    key_person: { id: string; label: string; score: number } | null
    has_contact_activity: boolean
    mode: string
  }
  available_tags: string[]
}

const linkTypeColors: Record<ApiLink["type"], string> = {
  owner: "#3b82f6", // 名刺の所有者（社員→名刺）
  email: "#10b981", // メール往来（社員→名刺）
  company: "#94a3b8", // 同社の名刺どうし
}

const linkTypeLabels: Record<ApiLink["type"], string> = {
  owner: "担当者",
  email: "メール往来",
  company: "同社",
}

interface NetworkGraphProps {
  onNodeClick?: (nodeId: string, type: ApiNode["type"]) => void
}

export function NetworkGraph({ onNodeClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<"recent" | "all" | "favorites">("recent")
  const [tagFilter, setTagFilter] = useState<string>("")
  const [minStrength, setMinStrength] = useState<number>(0)
  const [selected, setSelected] = useState<ApiNode | null>(null)

  // データ取得
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("mode", mode)
        params.set("minStrength", String(minStrength))
        if (tagFilter) params.set("tag", tagFilter)
        const res = await fetch(`/api/analytics/network?${params.toString()}`)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || `HTTP ${res.status}`)
        }
        const j = (await res.json()) as ApiResponse
        if (!cancelled) setData(j)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "取得に失敗しました")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [mode, tagFilter, minStrength])

  const nodes = data?.nodes ?? []
  const links = data?.links ?? []

  // 接続数集計（選択ノード詳細用）
  const connectionsByNode = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of links) {
      m.set(l.source, (m.get(l.source) || 0) + 1)
      m.set(l.target, (m.get(l.target) || 0) + 1)
    }
    return m
  }, [links])

  // 業種タグ凡例
  const tagLegend = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of nodes) {
      if (n.type !== "business_card") continue
      const tags = (n.meta.tags as string[] | undefined) || []
      const firstTag = tags[0] || "未分類"
      if (!m.has(firstTag)) m.set(firstTag, n.color)
    }
    return Array.from(m.entries()).slice(0, 12)
  }, [nodes])

  // d3描画
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])

    const g = svg.append("g")

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })

    zoomBehaviorRef.current = zoom
    svg.call(zoom)

    // d3シミュレーション用にidをコピー
    type SimNode = ApiNode & d3.SimulationNodeDatum
    type SimLink = d3.SimulationLinkDatum<SimNode> & { type: ApiLink["type"]; strength: number }

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }))
    const idToNode = new Map(simNodes.map((n) => [n.id, n]))
    const simLinks: SimLink[] = links
      .filter((l) => idToNode.has(l.source) && idToNode.has(l.target))
      .map((l) => ({
        source: idToNode.get(l.source)!,
        target: idToNode.get(l.target)!,
        type: l.type,
        strength: l.strength,
      }))

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => 80 + 60 / Math.max(1, d.strength))
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((d) => d.size / 2 + 4)
      )

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => linkTypeColors[d.type])
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d) => Math.min(4, 1 + Math.log2(d.strength + 1)))

    // Node groups
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Node circles（社員=四角風、名刺=丸 / 色は API から）
    nodeSel
      .append("circle")
      .attr("r", (d) => d.size / 2)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => (d.type === "employee" ? "#fbbf24" : "#1e293b"))
      .attr("stroke-width", (d) => (d.type === "employee" ? 2.5 : 1.5))

    // ラベル
    nodeSel
      .append("text")
      .text((d) => (d.label || "").slice(0, 6))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#f8fafc")
      .attr("font-size", (d) => Math.max(8, Math.min(11, d.size / 3.2)))
      .attr("font-weight", 600)
      .attr("pointer-events", "none")

    // 会社名（名刺のみ）
    nodeSel
      .filter((d) => d.type === "business_card")
      .append("text")
      .text((d) => ((d.meta.company as string | undefined) || "").slice(0, 10))
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.size / 2 + 12)
      .attr("fill", "#94a3b8")
      .attr("font-size", "9px")
      .attr("pointer-events", "none")

    nodeSel.on("click", (_, d) => {
      setSelected(d)
      onNodeClick?.(d.id, d.type)
    })

    nodeSel
      .on("mouseenter", function (_, d) {
        d3.select(this).select("circle").attr("stroke-width", 3.5)
        link
          .attr("stroke-opacity", (l) => {
            const s = (l.source as SimNode).id
            const t = (l.target as SimNode).id
            return s === d.id || t === d.id ? 1 : 0.08
          })
      })
      .on("mouseleave", function () {
        d3.select(this)
          .select("circle")
          .attr("stroke-width", (d2: unknown) => {
            const dd = d2 as SimNode
            return dd.type === "employee" ? 2.5 : 1.5
          })
        link.attr("stroke-opacity", 0.5)
      })

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0)
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links, onNodeClick])

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3)
  }
  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75)
  }
  const handleReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
  }

  const stats = data?.stats
  const nodesVisible = nodes.length
  const linksVisible = links.length
  const employeesVisible = nodes.filter((n) => n.type === "employee").length
  const cardsVisible = nodes.filter((n) => n.type === "business_card").length

  return (
    <div className="flex flex-col h-full">
      {/* KPIカード（実集計） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cardsVisible.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">表示中の名刺</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employeesVisible.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">社員</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linksVisible.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">関係性</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {stats?.key_person?.label || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.key_person ? `往来 ${stats.key_person.score} 件` : "キーパーソン候補なし"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* グラフ本体 */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">人脈ネットワーク</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 min-h-0">
            <div
              ref={containerRef}
              className="w-full h-full rounded-lg bg-background/50 overflow-hidden relative"
            >
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  読み込み中…
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
                  {error}
                </div>
              )}
              {!loading && !error && nodesVisible === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <p>表示できるノードがありません</p>
                  <p className="text-xs">フィルタを「すべて」に変更するか、最小強度を下げてください</p>
                </div>
              )}
              <svg ref={svgRef} className="w-full h-full" />
            </div>
          </CardContent>
        </Card>

        {/* 右ペイン: フィルタ・凡例・選択中 */}
        <div className="w-72 flex flex-col gap-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                フィルター
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">表示モード</label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">直近メール往来あり</SelectItem>
                    <SelectItem value="all">すべての名刺</SelectItem>
                    <SelectItem value="favorites">お気に入りのみ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">業種タグ</label>
                <Select
                  value={tagFilter || "__all__"}
                  onValueChange={(v) => setTagFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">すべて</SelectItem>
                    {(data?.available_tags || []).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  最小メール往来数 (90日): {minStrength}
                </label>
                <Slider
                  value={[minStrength]}
                  onValueChange={([v]) => setMinStrength(v)}
                  min={0}
                  max={20}
                  step={1}
                  className="py-2"
                />
                {!stats?.has_contact_activity && (
                  <p className="text-[10px] text-muted-foreground">
                    Gmail連携の往来データが未集計のため、強度フィルタは無効です
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 関係タイプ凡例（実データに基づく） */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">関係タイプ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(linkTypeColors) as ApiLink["type"][])
                .filter((t) => links.some((l) => l.type === t))
                .map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded-full" style={{ backgroundColor: linkTypeColors[t] }} />
                    <span className="text-xs text-muted-foreground">{linkTypeLabels[t]}</span>
                  </div>
                ))}
              {links.length === 0 && (
                <p className="text-xs text-muted-foreground">関係性なし</p>
              )}
            </CardContent>
          </Card>

          {/* 業種タグ凡例（ノード色の根拠） */}
          {tagLegend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">業種タグ（ノード色）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tagLegend.map(([tag, color]) => (
                  <div key={tag} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted-foreground truncate">{tag}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 選択中ノード詳細 */}
          {selected && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">選択中</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{selected.label}</p>
                  {selected.type === "business_card" ? (
                    <p className="text-xs text-muted-foreground">
                      {(selected.meta.company as string) || "—"}
                      {selected.meta.position ? ` / ${selected.meta.position}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      社員 / {(selected.meta.department as string) || "—"}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">接続数</span>
                  <Badge variant="secondary">{connectionsByNode.get(selected.id) || 0}</Badge>
                </div>
                {selected.type === "business_card" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">90日メール往来</span>
                    <Badge variant="secondary">{(selected.meta.score as number) || 0}</Badge>
                  </div>
                )}
                {selected.type === "business_card" && (selected.meta.tags as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {((selected.meta.tags as string[]) || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
