"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"

// demo.b-p.co.jp の上部に固定する CTA バー
// plus.b-p.co.jp では表示しない
export function DemoCtaBar() {
  const [show, setShow] = useState(false)
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname.toLowerCase()
    if (host.startsWith('plus.')) { setShow(false); return }
    if (host.startsWith('demo.') || host.startsWith('demo-')) setShow(true)
    else if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') setShow(true)
    // localStorage で閉じた状態を維持 (リロード後は再表示)
  }, [])
  if (!show || closed) return null
  // UTM パラメータを引き継ぐ
  const utm = typeof window !== 'undefined' ? window.location.search : ''
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap sticky top-0 z-50 shadow">
      <span className="text-sm font-medium">月額 ¥1,950 + 名刺 50 枚も毎月お届け</span>
      <Link
        href={`/contact-sales${utm}`}
        className="inline-flex items-center gap-1 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded-md text-sm shadow"
      >
        本契約に進む <ArrowRight className="w-4 h-4" />
      </Link>
      <button onClick={() => setClosed(true)} className="opacity-70 hover:opacity-100" aria-label="閉じる">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
