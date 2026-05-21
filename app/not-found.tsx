import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

// 404 ページ
// Next 16 で app/not-found.tsx が無いと「This page could not be found」固定文言になる
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          お探しのページは削除されたか、URL が変更された可能性があります。
        </p>
        <div className="pt-2">
          <Button asChild>
            <Link href="/">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
