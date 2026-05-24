"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"
import { NetworkGraph } from "@/components/network-graph"

export function NetworkGraphWrapper({ onNodeClick }: { onNodeClick?: (id: string, type: string) => void }) {
  const [fullscreen, setFullscreen] = useState(false)
  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col" : "h-[calc(100vh-220px)] min-h-[500px] flex flex-col"}>
      <div className="flex items-center justify-end pb-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setFullscreen(f => !f)}>
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {fullscreen ? "通常表示" : "全画面"}
        </Button>
      </div>
      <div className="flex-1 min-h-0 relative">
        <NetworkGraph onNodeClick={onNodeClick} />
      </div>
    </div>
  )
}
