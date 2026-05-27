"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ExternalLink } from "lucide-react"

// NEXT_PUBLIC_DEMO_MODE=true のとき、画面最上部に固定バナーで「これはデモです」を明示
export function DemoBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname.toLowerCase()
    // plus サブドメインでは絶対表示しない
    if (host.startsWith('plus.')) { setShow(false); return }
    if (host.startsWith('demo.') || host.startsWith('demo-')) { /* デモ廃止のため表示しない */ return }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') /* setShow(true) - demo deprecated */
  }, [])
  if (!show) return null
  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-3 sticky top-0 z-50">
      <AlertCircle className="w-4 h-4" />
      <span className="font-medium">デモモードで動作中</span>
      <span className="hidden sm:inline opacity-90">— データはモックで、保存しても永続化されません</span>
      <a
        href="https://plus.b-p.co.jp/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline inline-flex items-center gap-1 ml-2"
      >
        本番版で使う <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}
