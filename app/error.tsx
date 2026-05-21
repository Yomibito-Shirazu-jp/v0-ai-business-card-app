"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

// グローバルエラーバウンダリ
// Next 16 では app/error.tsx が無いとエラー時に真っ白画面に落ちる
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Phase 1 で Sentry / Supabase logs へ送信予定
    console.error("[名刺Plus] runtime error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">予期しないエラーが発生しました</h1>
        <p className="text-sm text-muted-foreground">
          画面の表示中に問題が発生しました。再試行してもエラーが続く場合は管理者へご連絡ください。
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            エラー ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={reset}>再試行</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            ホームへ戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
