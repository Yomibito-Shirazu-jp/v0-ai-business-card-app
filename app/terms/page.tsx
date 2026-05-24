export const metadata = { title: "利用規約 — 名刺Plus" }
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-4">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← ホームに戻る</a>
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="text-sm text-muted-foreground">最終更新: 2026 年 5 月</p>
        <section className="space-y-3 text-sm leading-relaxed">
          <p><strong>第 1 条 (適用)</strong> 本規約は 文唱堂印刷株式会社 (以下「当社」) が提供する「名刺Plus」(以下「本サービス」) の利用条件を定めるものです。</p>
          <p><strong>第 2 条 (利用条件)</strong> 本サービスは月額 1,950 円のサブスクで、50 枚以上の名刺発注を継続する顧客に限り利用可能です。発注が 60 日以上途絶えた場合、分析機能を含む全ての機能を停止します。</p>
          <p><strong>第 3 条 (アカウント)</strong> ご利用には Google アカウントによる本人確認が必要です。社員アカウントは経営者または管理者が招待した者に限ります。</p>
          <p><strong>第 4 条 (データの取り扱い)</strong> 名刺データ、メール件数の集計データは契約期間中、当社の管理下で保管します。本文・添付ファイル等の機微情報は保存しません。</p>
          <p><strong>第 5 条 (禁止事項)</strong> 不正アクセス、リバースエンジニアリング、第三者への譲渡、なりすましは禁止します。</p>
          <p><strong>第 6 条 (免責)</strong> 当社は本サービスの提供にあたり、可用性 99% を目標としますが、不具合等によって生じた損害について責任を負いません。</p>
          <p><strong>第 7 条 (規約改定)</strong> 当社は事前通知の上、本規約を改定することがあります。</p>
        </section>
      </div>
    </div>
  )
}
