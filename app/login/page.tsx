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
          {/* Google ログイン（公式 G ロゴ + 白背景・濃文字で視認性確保） */}
          <Button
            onClick={handleGoogle}
            disabled={pendingProvider !== null}
            className="w-full gap-3 h-11 bg-white text-[#1f1f1f] border border-[#dadce0] hover:bg-[#f8f9fa] hover:text-[#1f1f1f] shadow-sm"
            variant="outline"
          >
            {pendingProvider === "google" ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            <span className="font-medium">Google でログイン</span>
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
