import Link from "next/link"
import { Briefcase, Sparkles, Mail, Calendar, Shield, Building2, CheckCircle2, ArrowRight, FileText } from "lucide-react"

export const metadata = {
  title: "名刺Plus — AIで名刺管理＋月額¥1,950で名刺50枚も付いてくる",
  description: "文唱堂印刷が運営する AI 名刺管理 SaaS。Gmail / Calendar 連携、業種別分析、月額¥1,950 + 名刺50枚 / 月。中小・SOHO 向け。",
  robots: { index: true, follow: true },
}

const FEATURES = [
  { icon: Sparkles, title: "AI が名刺を自動取り込み", desc: "スマホで撮るだけで Gemini AI が氏名・会社・部署を自動入力。" },
  { icon: Mail, title: "Gmail と自動連携", desc: "顧客とのメール送受信頻度を業種別に集計、営業の取りこぼしを可視化。" },
  { icon: Calendar, title: "カレンダー予定の自動作成", desc: "名刺登録から Google カレンダーへ「フォローアップ」予定を自動投入。" },
  { icon: Building2, title: "業種別の自動分類", desc: "登録名刺の会社を 28 業種に AI が自動仕分け、傾向分析もワンクリック。" },
  { icon: Shield, title: "国産・暗号化保管", desc: "AES-256 暗号化、Gmail 本文は読み取らず保存もしません。" },
  { icon: FileText, title: "名刺50枚も毎月お届け", desc: "月額に名刺印刷代も込み。社員追加も翌月分から自動反映。" },
]

const FAQ = [
  { q: "月額に何が含まれますか？", a: "名刺Plus 全機能 (AI 取り込み、Gmail 連携、業種分析、カレンダー連携) + 月 50 枚の名刺印刷・配送が込みです。" },
  { q: "解約はいつでもできますか？", a: "管理画面からいつでも停止できます。違約金はありません。" },
  { q: "社員を追加した分の名刺もお願いできますか？", a: "はい、追加社員分はその枚数だけ別途お見積もりして月次請求に追加します。" },
  { q: "データはどこに保管されますか？", a: "東京リージョンの Supabase に暗号化保管。Gmail メタデータ (送受信日時) のみ取得し、本文は保存しません。" },
  { q: "デザインは自由ですか？", a: "テンプレート 3 種から選び、Web エディタで氏名・部署・色を編集できます。完全オーダーの場合は別途見積もり。" },
]

export default function LpPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="px-6 pt-16 pb-12 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary mb-5">
          <Briefcase className="w-3.5 h-3.5" />
          <span>文唱堂印刷が運営 — 創業 1933 年の信頼</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          名刺管理を AI に任せて、<br className="hidden md:block" />
          <span className="text-primary">月 50 枚の名刺もお届け</span>。
        </h1>
        <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">
          月額 ¥1,950 で AI が名刺を自動取り込み、Gmail と連携して営業分析。<br />
          さらに毎月 50 枚の名刺もお届けする全部入りプラン。
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-7">
          <Link href="/contact-sales" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg shadow hover:opacity-90">
            無料相談・お問い合わせ <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#features" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground px-4 py-3">
            機能を見る ↓
          </a>
        </div>
      </section>

      {/* 価格カード */}
      <section className="px-6 pb-12">
        <div className="max-w-md mx-auto rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center shadow">
          <div className="text-xs font-medium text-primary mb-1">スタンダードプラン</div>
          <div className="text-4xl font-bold mt-2">¥1,950<span className="text-base font-normal text-muted-foreground"> / 月 (税別)</span></div>
          <div className="text-sm text-muted-foreground mt-1">+ 名刺 50 枚 / 月のお届け込み</div>
          <ul className="text-sm text-left space-y-1.5 mt-5">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>AI 名刺取り込み・自動入力</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>Gmail / Calendar 連携</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>業種別 / 連絡頻度分析</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>毎月 50 枚の名刺印刷・配送込み</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>解約はいつでも</span></li>
          </ul>
          <Link href="/contact-sales" className="block mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg">
            お問い合わせはこちら →
          </Link>
        </div>
      </section>

      {/* 機能 */}
      <section id="features" className="px-6 py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">名刺Plus でできること</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5 space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">よくあるご質問</h2>
          <div className="space-y-3">
            {FAQ.map(f => (
              <details key={f.q} className="bg-card border border-border rounded-lg p-4">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-primary/5 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">名刺管理を AI に任せませんか？</h2>
        <p className="text-muted-foreground mt-3">月額 ¥1,950 + 名刺 50 枚も毎月お届け</p>
        <Link href="/contact-sales" className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg shadow hover:opacity-90">
          お問い合わせはこちら <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        <div>文唱堂印刷株式会社 — 〒101-0044 東京都千代田区鍛冶町2-2-2</div>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
          <Link href="/contact-sales" className="hover:underline">お問い合わせ</Link>
        </div>
      </footer>
    </div>
  )
}
