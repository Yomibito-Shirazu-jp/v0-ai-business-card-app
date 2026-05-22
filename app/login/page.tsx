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

              <Button
                onClick={handleGoogle}
                disabled={pending !== null}
                variant="outline"
                className="w-full h-11 gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300"
              >
                {pending === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                    </svg>
                    <span className="font-medium">Google でログイン</span>
                  </>
                )}
              </Button>
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
