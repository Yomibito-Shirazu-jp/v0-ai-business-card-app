"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { Loader2, Maximize2, Minimize2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GmailSyncButton } from "./gmail-sync-button"

interface NodeData {
  id: string
  type: 'me' | 'business_card'
  label: string
  sublabel?: string
  size: number
  color: string
  msgs_30d?: number
  msgs_90d?: number
  msgs_365d?: number
  industry?: string
}
interface LinkData {
  source: string
  target: string
  value: number
  width: number
}

export function EmailNetworkGraph({ onCardClick }: { onCardClick?: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ nodes: NodeData[]; links: LinkData[]; hasData: boolean; summary?: { contacts: number; totalMessages: number } } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics/email-network", { cache: "no-store" })
        if (!res.ok) throw new Error(await res.text())
        const j = await res.json()
        if (!cancelled) setData(j)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !svgRef.current || !containerRef.current) return
    const container = containerRef.current
    const svg = d3.select(svgRef.current)
    const w = container.clientWidth
    const h = container.clientHeight
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${w} ${h}`)

    const nodes: any[] = data.nodes.map(n => ({ ...n }))
    const links: any[] = data.links.map(l => ({ ...l }))

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(d => 60 + (1 / (d.value / 5 + 1)) * 80))
      .force("charge", d3.forceManyBody().strength((d: any) => -120 - d.size * 4))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.size + 4))

    const g = svg.append("g")

    // Zoom
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on("zoom", (e) => {
      g.attr("transform", e.transform.toString())
    }) as any)

    const linkSel = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "rgba(120,120,140,0.4)")
      .attr("stroke-width", d => d.width)

    const nodeSel = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", d => d.type === "business_card" ? "pointer" : "default")
      .on("mouseenter", (_e, d) => setHoveredNode(d))
      .on("mouseleave", () => setHoveredNode(null))
      .on("click", (_e, d: any) => {
        if (d.type === "business_card" && onCardClick) {
          onCardClick(d.id.replace(/^card_/, ""))
        }
      })

    nodeSel.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", "rgba(255,255,255,0.7)")
      .attr("stroke-width", 1.5)

    nodeSel.append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.size + 12)
      .attr("font-size", 10)
      .attr("fill", "rgba(200,200,210,0.9)")
      .style("pointer-events", "none")

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
      nodeSel.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    nodeSel.call(d3.drag<any, any>()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))

    return () => { sim.stop() }
  }, [data, fullscreen, onCardClick])

  const containerCls = fullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "h-[calc(100vh-260px)] min-h-[500px] flex flex-col"

  return (
    <div className={containerCls}>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8"><Loader2 className="w-4 h-4 animate-spin" /> 集計中...</div>
      ) : error ? (
        <div className="text-destructive p-4 text-sm">エラー: {error}</div>
      ) : !data?.hasData ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-700">メール送受信データがありません</CardTitle>
            <CardDescription>下のボタンで Gmail を同期してください (過去 90 日のメタデータのみ取得)。</CardDescription>
          </CardHeader>
          <CardContent>
            <GmailSyncButton onDone={() => location.reload()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <div className="text-sm text-muted-foreground">
              連絡先 {data.summary?.contacts ?? 0} 件 / 合計 {data.summary?.totalMessages ?? 0} 通 (直近 90 日)
            </div>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {fullscreen ? "通常表示" : "全画面"}
            </Button>
          </div>
          <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-lg border border-border bg-card/40">
            <svg ref={svgRef} className="w-full h-full" />
            {hoveredNode && (
              <div className="absolute top-3 left-3 max-w-sm bg-card/95 border border-border rounded-lg px-3 py-2 text-sm shadow-lg pointer-events-none">
                <div className="font-medium">{hoveredNode.label}</div>
                {hoveredNode.sublabel && <div className="text-xs text-muted-foreground">{hoveredNode.sublabel}</div>}
                {hoveredNode.industry && <div className="text-xs text-muted-foreground mt-1">業種: {hoveredNode.industry}</div>}
                <div className="text-xs mt-1 grid grid-cols-3 gap-2">
                  <div>30日: <span className="font-mono">{hoveredNode.msgs_30d ?? 0}</span></div>
                  <div>90日: <span className="font-mono">{hoveredNode.msgs_90d ?? 0}</span></div>
                  <div>365日: <span className="font-mono">{hoveredNode.msgs_365d ?? 0}</span></div>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            ノードサイズ = メッセージ数 (90日)、色 = 業種、エッジ太さ = 連絡頻度
          </p>
        </>
      )}
    </div>
  )
}
