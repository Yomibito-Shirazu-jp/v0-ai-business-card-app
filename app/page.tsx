import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import {
  ScanLine,
  Sparkles,
  Newspaper,
  Users2,
  ShieldCheck,
  Zap,
  Mail,
  Building2,
  ArrowRight,
  Briefcase,
  CheckCircle2,
} from "lucide-react"

// ランディングページ
// /app 以下が認証必須のダッシュボード本体、'/' は誰でも閲覧可能な公開 LP
// 認証状態に応じて主 CTA を 'アプリを開く' / '無料ではじめる' で出し分ける
export const metadata = {
  title: "名刺Plus — 名刺をスマホで撮るだけ、AIが営業を加速する",
  description:
    "Google Workspace 連携の AI 名刺管理。名刺をスマホで撮るだけで OCR・会社情報・最新ニュース・営業メール下書きまで自動化。",
  robots: { index: true, follow: true },
}

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  const primaryHref = isAuthenticated ? "/app" : "/login"
  const primaryLabel = isAuthenticated ? "アプリを開く" : "無料ではじめる"

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">名刺Plus</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5">
            <Link
              href="#features"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              特長
            </Link>
            <Link
              href="#how-it-works"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              使い方
            </Link>
            <Link
              href="#pricing"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              料金
            </Link>
            <Link
              href="/shop"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              名刺を購入
            </Link>
            <Button asChild size="sm" className="ml-1.5">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent_70%)]"
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              AI が営業の一歩目を肩代わり
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              名刺は、<span className="text-primary">繋がり始まり</span>。
              <br className="hidden sm:block" />
              続きは、AI が書く。
            </h1>
            <p className="mt-5 text-pretty text-base text-muted-foreground sm:text-lg">
              スマホで撮るだけで OCR、会社情報、最新ニュース、初回メール下書きまで自動。
              名刺を「撮って終わり」から「商談につなげる」道具へ。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
                <Link href={primaryHref} className="gap-2">
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
                <Link href="/shop" className="gap-2">
                  名刺を購入する
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Google ログイン / メール Magic Link 対応。クレジットカード不要。
            </p>
          </div>

          {/* ヒーロービジュアル: 名刺カード→AI提案 のメタファーを CSS だけで構築 */}
          <div className="relative mx-auto mt-14 max-w-4xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="relative overflow-hidden p-5 shadow-sm">
                <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <ScanLine className="h-3.5 w-3.5" aria-hidden="true" /> SCANNED CARD
                </div>
                <div className="mt-3 space-y-1.5">
                  <p className="text-base font-semibold leading-tight">山田 太郎</p>
                  <p className="text-xs text-muted-foreground">株式会社サンプル / 営業部 部長</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">B2B SaaS</Badge>
                    <Badge variant="outline" className="text-[10px]">関東</Badge>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  taro@example.co.jp
                </div>
              </Card>

              <Card className="relative overflow-hidden border-primary/30 bg-primary/[0.04] p-5 shadow-sm">
                <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI DRAFT
                </div>
                <p className="mt-3 text-sm font-semibold leading-snug">
                  先日はお時間ありがとうございました
                </p>
                <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                  山田様、本日は名刺交換させていただきありがとうございました。
                  御社が先日プレスリリースされた新サービスに関し、
                  弊社で支援できそうな点が3つございましたので…
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-primary">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  会話アイスブレイク3件・フォローアップ提案つき
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted strip */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 text-center sm:grid-cols-4">
          {[
            { k: "1秒", v: "名刺撮影→OCR" },
            { k: "AI", v: "メール下書き自動生成" },
            { k: "RLS", v: "Supabase で安全管理" },
            { k: "Google", v: "Workspace 連携対応" },
          ].map((s) => (
            <div key={s.k} className="px-2">
              <p className="text-lg font-bold tracking-tight">{s.k}</p>
              <p className="text-xs text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              名刺管理の「面倒」を、まるごと AI に。
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              入力・調査・下書きを全部肩代わり。あなたは「人と話す」ことに集中できます。
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: ScanLine,
                title: "撮るだけスキャン",
                desc: "スマホ・PC・PDF いずれも対応。撮影と同時に高精度 OCR で読み取り、ふりがなや会社名カナまで構造化。",
              },
              {
                Icon: Sparkles,
                title: "AI 営業アシスタント",
                desc: "名刺・会社情報・メモから、初回メール下書き / 会話アイスブレイク / フォローアップ提案を自動生成。",
              },
              {
                Icon: Newspaper,
                title: "最新ニュースを自動取得",
                desc: "会社名から関連ニュースを取得・タブで表示。商談前の情報収集の手間がゼロに。",
              },
              {
                Icon: Users2,
                title: "社員管理 & 役割",
                desc: "経営者 / 管理者 / 社員のロール管理、ログイン履歴、権限委譲、退会まで一画面で完結。",
              },
              {
                Icon: ShieldCheck,
                title: "RLS によるデータ保護",
                desc: "Supabase の Row Level Security により、自分以外のデータにはアクセス不可。安全な共有設計。",
              },
              {
                Icon: Zap,
                title: "Google Workspace 連携",
                desc: "Magic Link / Google OAuth に対応。ドメイン制限と社員招待で社内利用に最適。",
              },
            ].map(({ Icon, title, desc }) => (
              <Card key={title} className="p-5 transition-colors hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">3ステップで導入完了</h2>
            <p className="mt-3 text-muted-foreground">
              使いはじめは1分。社員招待もメール一通で済みます。
            </p>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "ログイン",
                desc: "Google アカウントまたは会社のメールアドレスで Magic Link 認証。",
              },
              {
                n: "02",
                title: "名刺をスキャン",
                desc: "スマホのカメラ・画像アップロード・PDF 一括登録に対応。OCR 結果はその場で編集可能。",
              },
              {
                n: "03",
                title: "AI に任せる",
                desc: "詳細画面の『AI提案』タブで初回メール / アイスブレイクを生成。コピーまたはメール起動で送信。",
              },
            ].map((step) => (
              <li key={step.n}>
                <Card className="h-full p-5">
                  <p className="text-2xl font-bold tracking-tight text-primary/80">{step.n}</p>
                  <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">まずは無料ではじめる</h2>
            <p className="mt-3 text-muted-foreground">
              小規模チーム / SOHO の方は無料枠で全機能を試せます。
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Free</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">¥0</p>
              <p className="mt-1 text-xs text-muted-foreground">いつまでも無料</p>
              <ul className="mt-4 space-y-2 text-sm">
                {["名刺登録 100件まで", "AI メール提案 月10回", "Google ログイン", "個人利用に最適"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            </Card>

            <Card className="border-primary/40 bg-primary/[0.03] p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-primary">Team</p>
                <Badge variant="secondary" className="text-[10px]">準備中</Badge>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">¥980<span className="text-base font-normal text-muted-foreground">/人/月</span></p>
              <p className="mt-1 text-xs text-muted-foreground">5名から</p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "名刺登録 無制限",
                  "AI メール提案 無制限",
                  "社員ロール / ログイン履歴",
                  "RLS によるデータ保護",
                  "優先サポート",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="mailto:contact@b-p.co.jp?subject=名刺Plus%20Team%20プランお問い合わせ">
                  問い合わせる
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            名刺の山を、商談につなげる。
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            撮影 → AI下書き → 送信を、1つの画面で完結。今日から、営業の最初の一歩を AI に任せてください。
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href={primaryHref} className="gap-2">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>© {new Date().getFullYear()} b-p, Inc. — 名刺Plus</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">ログイン</Link>
            <Link href="/app" className="hover:text-foreground">アプリ</Link>
            <a href="mailto:contact@b-p.co.jp" className="hover:text-foreground">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
