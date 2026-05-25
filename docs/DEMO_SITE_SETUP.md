# デモサイト (demo.b-p.co.jp) のセットアップ手順

本リポジトリは同じコードベースで「本番」「デモ」を切り替える方式です。
環境変数 `NEXT_PUBLIC_DEMO_MODE=true` を立てると、認証バイパス＋モックデータ返却となります。

## 1. Vercel に新しいプロジェクトを作る (5 クリック)

1. https://vercel.com/new を開く
2. GitHub から `Yomibito-Shirazu-jp/v0-ai-business-card-app` を選択
3. Project Name: `v0-ai-business-card-app-demo`
4. Framework Preset: Next.js (自動検出)
5. Build & Output: そのまま
6. **Environment Variables** に次を追加:

   | Key | Value | 用途 |
   |---|---|---|
   | `NEXT_PUBLIC_DEMO_MODE` | `true` | 認証バイパス & モックデータ返却 |
   | `NEXT_PUBLIC_SUPABASE_URL` | (空) | 不要 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (空) | 不要 |

7. **Deploy** をクリック

## 2. カスタムドメイン `demo.b-p.co.jp` を設定

1. 上で作ったプロジェクトの **Settings → Domains**
2. `demo.b-p.co.jp` を追加
3. Vercel が「CNAME を b-p.co.jp の DNS に追加してください」と指示するのでコピー
4. b-p.co.jp の DNS 管理画面 (Cloudflare / Route53 等) で:
   ```
   demo.b-p.co.jp.   CNAME   cname.vercel-dns.com.   (TTL 300)
   ```
   を追加
5. DNS 反映を待って (5-10 分) Vercel 側で「Valid」になることを確認

## 3. 動作確認

- https://demo.b-p.co.jp/ → ログインせずダッシュボードが見える
- 画面上部にオレンジの「**デモモードで動作中**」バナーが出る
- すべての名刺 / 社員 / 集計 はモックデータ
- 保存ボタンを押しても永続化されない (Supabase に書かない)

## 4. LP からのリンク

- 本番 `plus.b-p.co.jp/login` のログイン画面に「**👀 デモを試す (ログイン不要)**」リンクを追加済み (本 PR)
- 必要なら別途 LP (例: `b-p.co.jp/` トップ) からも `https://demo.b-p.co.jp/` にリンクする

## 5. (オプション) 検索エンジン除外

デモサイトは Google にインデックスされたくないので、Vercel プロジェクトの **Settings → Security → Deployment Protection** で **Vercel Authentication** を on にするか、`vercel.json` に以下を追加:

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }
  ]
}
```

## 制限事項 / 今後の課題

- デモは静的モック (3 社員 + 5 名刺) なので、業界別分析や顧客連絡頻度は表示が薄い
  → 必要なら `lib/demo-data.ts` を拡張して 50 名刺程度に増やせる
- Gmail 同期や Document AI OCR はデモモードでは動かない (外部 API キー要らないように return)
- Print 発注はデモモードでは "ありがとうございます" のトーストだけ出して終了 (将来実装)

