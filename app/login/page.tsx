"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

// ログインページ
// 主動線: メール Magic Link (Supabase 標準、追加設定不要)
// 補助動線: Google OAuth (Supabase Dashboard で Google Provider 設定済みの場合のみ動作)
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get("next") || "/"
  const initialError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [pending, setPending] = useState<"google" | "email" | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    initialError ? { type: "error", text: `ログインに失敗しました: ${initialError}` } : null,
  )
  const [sent, setSent] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setPending("email")
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })
    setPending(null)
    if (error) {
      setMessage({ type: "error", text: `メール送信に失敗: ${error.message}` })
    } else {
      setSent(true)
      setMessage({
        type: "success",
        text: `${email} に「ログイン用リンク」を送信しました。メールを確認してください(数十秒で届きます)。`,
      })
    }
  }

  async function handleGoogle() {
    setPending("google")
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // hd 強制は外す。社員の Workspace ドメインに合わせて Google が判定
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })
    if (error) {
      setPending(null)
      setMessage({
        type: "error",
        text: `Google ログインが利用できません: ${error.message}。メールでログインをご利用ください。`,
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <Briefcase className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">名刺Plus</CardTitle>
          <CardDescription>会社のメールアドレスでログインしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block">メールアドレス</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="your-email@b-p.co.jp"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending !== null}
                    className="pl-9 h-11 text-base"
                    required
                  />
                </div>
              </label>
              <Button
                type="submit"
                disabled={pending !== null || !email}
                className="w-full h-11 text-base"
                size="lg"
              >
                {pending === "email" ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    メールでログインリンクを送る
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-accent mx-auto" aria-hidden="true" />
              <p className="text-sm">
                <strong>{email}</strong> 宛にリンクを送信しました
              </p>
              <p className="text-xs text-muted-foreground">
                メールに記載のボタンをクリックすると自動でログインされます。
                <br />
                数分以内に届かない場合は迷惑メールフォルダもご確認ください。
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSent(false); setMessage(null); setEmail("") }}
              >
                別のメールアドレスで再送
              </Button>
            </div>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-lg border ${
                message.type === "success"
                  ? "bg-accent/10 text-accent-foreground border-accent/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <span className="break-words">{message.text}</span>
            </div>
          )}

          {!sent && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">または</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={pending !== null}
                className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white text-[#1f1f1f] text-sm font-medium shadow-sm hover:bg-[#f8f9fa] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {pending === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#1f1f1f]" aria-hidden="true" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                )}
                <span>Google でログイン</span>
              </button>
              <p className="text-[11px] text-muted-foreground text-center px-2">
                Google アカウントをお持ちの方は上のボタン、お持ちでない場合は上のメール入力をご利用ください。
              </p>
            </>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground text-center">
              社員登録は社長 / 管理者が <code className="text-foreground/70">@b-p.co.jp</code> のメールアドレスを社員管理画面で追加してください。Google ログインでも、社員登録済みのメールアドレスであれば自動で有効化されます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
