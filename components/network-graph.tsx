"use client"

import { useEffect, useRef, useState } from "react"
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
  Maximize2,
  RotateCcw,
  Download,
  Filter,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
} from "lucide-react"

interface NetworkNode {
  id: string
  name: string
  company: string
  position: string
  influence: number // 1-100
  connections: number
  tags: string[]
  group: string
}

interface NetworkLink {
  source: string
  target: string
  strength: number // 1-10
  type: "business" | "referral" | "meeting" | "project"
}

interface NetworkGraphProps {
  nodes: NetworkNode[]
  links: NetworkLink[]
  onNodeClick?: (node: NetworkNode) => void
}

const linkTypeColors: Record<string, string> = {
  business: "#3b82f6",
  referral: "#10b981",
  meeting: "#f59e0b",
  project: "#8b5cf6",
}

const linkTypeLabels: Record<string, string> = {
  business: "取引関係",
  referral: "紹介",
  meeting: "面談",
  project: "プロジェクト",
}

export function NetworkGraph({ nodes, links, onNodeClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [filterGroup, setFilterGroup] = useState<string>("all")
  const [linkStrengthMin, setLinkStrengthMin] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(1)

  const groups = Array.from(new Set(nodes.map((n) => n.group)))

  const filteredNodes = filterGroup === "all" ? nodes : nodes.filter((n) => n.group === filterGroup)
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredLinks = links.filter(
    (l) =>
      filteredNodeIds.has(l.source) &&
      filteredNodeIds.has(l.target) &&
      l.strength >= linkStrengthMin
  )

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredNodes.length === 0) return

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
        g.attr("transform", event.transform)
        setZoomLevel(event.transform.k)
      })

    svg.call(zoom)

    const simulation = d3
      .forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d: unknown) => (d as NetworkNode).id)
          .distance((d: unknown) => 150 - (d as NetworkLink).strength * 10)
          .strength((d: unknown) => (d as NetworkLink).strength / 10)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50))

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", (d) => linkTypeColors[d.type])
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.strength) * 1.5)

    // Node groups
    const node = g
      .append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, NetworkNode>()
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
          }) as unknown as (selection: d3.Selection<SVGGElement, NetworkNode, SVGGElement, unknown>) => void
      )

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => 20 + d.influence / 10)
      .attr("fill", "#1e293b")
      .attr("stroke", (d) => (d.id === selectedNode?.id ? "#3b82f6" : "#475569"))
      .attr("stroke-width", (d) => (d.id === selectedNode?.id ? 3 : 1.5))

    // Influence indicator
    node
      .append("circle")
      .attr("r", (d) => 16 + d.influence / 10)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", (d) => {
        const circumference = 2 * Math.PI * (16 + d.influence / 10)
        const dashLength = (d.influence / 100) * circumference
        return `${dashLength} ${circumference - dashLength}`
      })
      .attr("stroke-dashoffset", (d) => {
        const circumference = 2 * Math.PI * (16 + d.influence / 10)
        return circumference / 4
      })

    // Node labels
    node
      .append("text")
      .text((d) => d.name.slice(0, 4))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#f8fafc")
      .attr("font-size", "10px")
      .attr("font-weight", "500")

    // Company labels below
    node
      .append("text")
      .text((d) => d.company.slice(0, 8))
      .attr("text-anchor", "middle")
      .attr("dy", (d) => 32 + d.influence / 10)
      .attr("fill", "#94a3b8")
      .attr("font-size", "9px")

    // Click handler
    node.on("click", (_, d) => {
      setSelectedNode(d)
      onNodeClick?.(d)
    })

    // Hover effects
    node
      .on("mouseenter", function (_, d) {
        d3.select(this).select("circle").attr("stroke", "#3b82f6").attr("stroke-width", 3)

        link
          .attr("stroke-opacity", (l) =>
            (l.source as unknown as NetworkNode).id === d.id ||
            (l.target as unknown as NetworkNode).id === d.id
              ? 1
              : 0.1
          )
          .attr("stroke-width", (l) =>
            (l.source as unknown as NetworkNode).id === d.id ||
            (l.target as unknown as NetworkNode).id === d.id
              ? Math.sqrt(l.strength) * 2.5
              : Math.sqrt(l.strength) * 1.5
          )
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .select("circle")
          .attr("stroke", d.id === selectedNode?.id ? "#3b82f6" : "#475569")
          .attr("stroke-width", d.id === selectedNode?.id ? 3 : 1.5)

        link.attr("stroke-opacity", 0.6).attr("stroke-width", (l) => Math.sqrt(l.strength) * 1.5)
      })

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as unknown as { x: number }).x)
        .attr("y1", (d) => (d.source as unknown as { y: number }).y)
        .attr("x2", (d) => (d.target as unknown as { x: number }).x)
        .attr("y2", (d) => (d.target as unknown as { y: number }).y)

      node.attr("transform", (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [filteredNodes, filteredLinks, selectedNode, onNodeClick])

  const handleZoomIn = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>, k: number) => void, 1.3)
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>, k: number) => void, 0.7)
  }

  const handleReset = () => {
    if (!svgRef.current || !containerRef.current) return
    const svg = d3.select(svgRef.current)
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as unknown as (selection: d3.Transition<SVGSVGElement, unknown, null, undefined>, transform: d3.ZoomTransform) => void,
      d3.zoomIdentity.translate(0, 0).scale(1)
    )
  }

  // Stats
  const totalConnections = filteredLinks.length
  const avgInfluence = Math.round(filteredNodes.reduce((a, b) => a + b.influence, 0) / filteredNodes.length)
  const topInfluencer = filteredNodes.reduce((a, b) => (a.influence > b.influence ? a : b), filteredNodes[0])

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredNodes.length}</p>
              <p className="text-xs text-muted-foreground">総コンタクト</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConnections}</p>
              <p className="text-xs text-muted-foreground">関係性</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgInfluence}</p>
              <p className="text-xs text-muted-foreground">平均影響度</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold truncate">{topInfluencer?.name}</p>
              <p className="text-xs text-muted-foreground">キーパーソン</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Graph */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 min-h-0">
            <div ref={containerRef} className="w-full h-full rounded-lg bg-background/50 overflow-hidden">
              <svg ref={svgRef} className="w-full h-full" />
            </div>
          </CardContent>
        </Card>

        {/* Controls & Legend */}
        <div className="w-72 flex flex-col gap-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                フィルター
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">グループ</label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  関係強度 (最小: {linkStrengthMin})
                </label>
                <Slider
                  value={[linkStrengthMin]}
                  onValueChange={([v]) => setLinkStrengthMin(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="py-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">関係タイプ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(linkTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-4 h-1 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted-foreground">
                    {linkTypeLabels[type]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Node Info */}
          {selectedNode && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">選択中</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{selectedNode.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedNode.company} / {selectedNode.position}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">影響度</span>
                  <Badge variant="secondary">{selectedNode.influence}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">接続数</span>
                  <Badge variant="secondary">{selectedNode.connections}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// D3 node extension
declare module "d3" {
  interface SimulationNodeDatum {
    x?: number
    y?: number
    fx?: number | null
    fy?: number | null
  }
}
