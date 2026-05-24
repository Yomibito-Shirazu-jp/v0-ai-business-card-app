export const metadata = { title: "プライバシーポリシー — 名刺Plus" }
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-4">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← ホームに戻る</a>
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground">最終更新: 2026 年 5 月</p>
        <section className="space-y-3 text-sm leading-relaxed">
          <p>文唱堂印刷株式会社 (以下「当社」) は、本サービスでお預かりする情報を以下の通り取り扱います。</p>

          <h2 className="text-base font-semibold mt-4">1. 取得する情報</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>名刺画像・テキスト (OCR 結果)</li>
            <li>会社情報・社員情報・連絡先</li>
            <li>Gmail / Google Calendar の<strong>メタデータのみ</strong> (送受信者 / 件数 / 日時)。本文は保存しません</li>
            <li>ログイン履歴・アクセスログ (セキュリティ目的)</li>
          </ul>

          <h2 className="text-base font-semibold mt-4">2. 利用目的</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>名刺管理および分析機能の提供</li>
            <li>顧客サポート・障害対応</li>
            <li>本サービス改善のための統計分析 (個人を識別できない形式)</li>
          </ul>

          <h2 className="text-base font-semibold mt-4">3. 保管とセキュリティ</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>データは Supabase 上で暗号化保管 (AES-256 at-rest, TLS 1.2+ in-transit)</li>
            <li>Row-Level Security により、他社データは閲覧できません</li>
            <li>Google OAuth トークンはセッション中のみ保持、長期保管しません</li>
            <li>Gmail 同期はメタデータ取得のみで、件名・本文・添付は読み取りません</li>
          </ul>

          <h2 className="text-base font-semibold mt-4">4. 第三者提供</h2>
          <p>個人を特定可能な情報を、お客様の同意なく第三者に提供することはありません。但し、法令に基づく開示請求があった場合を除きます。</p>

          <h2 className="text-base font-semibold mt-4">5. 退会・データ削除</h2>
          <p>設定画面の「アカウントを退会」から退会可能です。データは即時に論理削除し、30 日後に物理削除します。</p>

          <h2 className="text-base font-semibold mt-4">6. お問い合わせ</h2>
          <p>個人情報の開示・訂正・削除のご請求は <a href="mailto:privacy@b-p.co.jp" className="text-primary underline">privacy@b-p.co.jp</a> までご連絡ください。</p>
        </section>
      </div>
    </div>
  )
}
