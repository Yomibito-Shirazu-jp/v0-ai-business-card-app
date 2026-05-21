"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Mail, Loader2 } from "lucide-react"

// ログインページ
// - Google OAuth (Supabase Auth provider に設定済みなら使える)
// - メール Magic Link (Supabase Auth 標準、設定不要)
//
// プロトタイプ段階のため、メールドメインの強制チェック(@b-p.co.jp 限定)はせず、
// 「会社名刺帳」モデルの employees レコードに登録された人だけが RLS で名刺を見られる仕組み。
// (employees 未登録のユーザーがログインしても、business_cards は 0 件返るだけ)
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get("next") || "/"

  const [email, setEmail] = useState("")
  const [pendingProvider, setPendingProvider] = useState<"google" | "email" | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleGoogle() {
    setPendingProvider("google")
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Google Workspace のドメイン強制 (b-p.co.jp 内のみログイン許可)
        // queryParams 経由で Google 側に hd= を送る
        queryParams: { hd: "b-p.co.jp" },
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })
    if (error) {
      setPendingProvider(null)
      setMessage({
        type: "error",
        text: `Google ログインに失敗しました: ${error.message}`,
      })
    }
    // 成功時はリダイレクト発生のため、以降は実行されない
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setPendingProvider("email")
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })
    setPendingProvider(null)
    if (error) {
      setMessage({
        type: "error",
        text: `メール送信に失敗しました: ${error.message}`,
      })
    } else {
      setMessage({
        type: "success",
        text: `${email} 宛にログインリンクを送信しました。メールを確認してください。`,
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">名刺Plus</CardTitle>
          <CardDescription>AI 名刺管理にログインしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google ログイン */}
          <Button
            onClick={handleGoogle}
            disabled={pendingProvider !== null}
            className="w-full gap-2"
            variant="outline"
          >
            {pendingProvider === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                />
              </svg>
            )}
            <span>Google でログイン</span>
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">または</span>
            </div>
          </div>

          {/* メール Magic Link */}
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="email"
                placeholder="email@b-p.co.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pendingProvider !== null}
                className="pl-9"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={pendingProvider !== null || !email}
              className="w-full"
            >
              {pendingProvider === "email" ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                "メールでログインリンクを送る"
              )}
            </Button>
          </form>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === "success"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {message.text}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            社員登録は社長が <code className="text-foreground/70">@b-p.co.jp</code> のメールアドレスを管理画面に追加すると、Google ログインで自動有効化されます。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
