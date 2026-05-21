import { Loader2 } from "lucide-react"

// グローバルローディング(ルート遷移時に表示される)
// 軽量に保ち、Phase 6 でルート別 loading.tsx を個別最適化する
export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
        <span className="text-sm">読み込み中...</span>
      </div>
    </div>
  )
}
