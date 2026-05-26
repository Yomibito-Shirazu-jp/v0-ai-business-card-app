# 名刺Plus 広告コピー (初回ローンチ用)

着地ページ: **https://demo.b-p.co.jp/?utm_source=XXX&utm_medium=cpc&utm_campaign=launch**

主な訴求軸:
1. 月額 ¥1,950 とリーズナブル
2. **名刺 50 枚も毎月付いてくる** (実質名刺代込み = 印刷代だけでお釣りが来る)
3. AI で名刺自動登録・分析・営業支援
4. Google Workspace 連携 (Gmail / Calendar)
5. デモ即体験

## Google 検索広告 (見出し 30 全角 / 説明文 90 全角以内)

### 案 1 — 価格訴求
- 見出し1: 月1,950円のAI名刺管理
- 見出し2: 名刺50枚も毎月付いてくる
- 見出し3: 文唱堂印刷が運営
- 説明文1: AI が名刺を自動取り込み・分析。月額1,950円 (税別) で名刺50枚もお届け。今すぐ無料でデモが触れます。
- 説明文2: Google 連携で Gmail・カレンダーから顧客連絡頻度を可視化。営業の取りこぼしを防ぎます。

### 案 2 — AI 機能訴求
- 見出し1: AI が名刺を自動仕分け
- 見出し2: 業種別の連絡頻度を可視化
- 見出し3: 月1,950円 + 名刺50枚
- 説明文1: スキャンするだけで Gemini AI が氏名・会社・業種を自動抽出。営業薄企業もすぐわかる。
- 説明文2: 顧客との連絡頻度が下がった会社を自動アラート。フォロー漏れゼロに。デモを試す。

### 案 3 — 業務効率訴求
- 見出し1: 名刺の入力・管理ゼロ円
- 見出し2: 印刷も込みで月1,950円
- 見出し3: AIですべて自動化
- 説明文1: 名刺をスマホで撮るだけ。氏名・部署・連絡先を AI が自動入力します。
- 説明文2: 月50枚の印刷もセットなので、別途名刺発注は不要。社員追加もワンクリック。

### 案 4 — Trust 訴求
- 見出し1: 文唱堂が作るAI名刺管理
- 見出し2: 月1,950円・名刺50枚付き
- 見出し3: 国産・日本語OCR強化
- 説明文1: 創業1933年の老舗印刷会社が運営。データは暗号化保管、Gmail本文は読みません。
- 説明文2: 名刺50枚 + AIアシスタント + Gmail連携 + Google カレンダー連携で月1,950円。

### 案 5 — 競合比較訴求
- 見出し1: Sansan より98%安い
- 見出し2: 月1,950円 (名刺50枚込)
- 見出し3: 中小企業向け
- 説明文1: 高額な名刺管理SaaSはもう不要。月1,950円で AI 名刺管理 + 50枚の印刷もお届け。
- 説明文2: SOHO・中小・士業向け。デモ即体験可、契約も即日反映。

## Meta (Facebook / Instagram) 広告コピー (Primary text 125 字目安)

### 案 1
> 名刺を撮るだけで AI が自動取り込み。さらに毎月名刺 50 枚を会社にお届けして月額 1,950 円。文唱堂印刷の中小企業向け SaaS、今すぐデモ体験可。

### 案 2
> 顧客との連絡頻度が薄くなった会社、すぐ気付けていますか？ AI が Gmail メタデータから自動分析。月 1,950 円で名刺 50 枚も付きます。

### 案 3
> Sansan ほど高くない、Eight ほど雑じゃない。社員 10 名以下の会社向け AI 名刺管理「名刺Plus」。月 1,950 円・名刺込み。デモを触る。

### 案 4
> 「あの会社、最近どうしてるかな」が消える瞬間を、文唱堂が作りました。AI が名刺と Gmail を結びつけて全部見せてくれます。

### 案 5
> 名刺の山、撮るだけで AI が読みます。さらに月 50 枚の新規名刺もお届けして、月 1,950 円。経費削減と顧客管理を同時に。

---

## UTM パラメータ規約 (運用)

| 媒体 | utm_source | utm_medium | utm_campaign |
|---|---|---|---|
| Google 検索 | google | cpc | launch_2026q2 |
| Google ディスプレイ | google | display | launch_2026q2 |
| Meta (FB) | meta-fb | cpc | launch_2026q2 |
| Meta (IG) | meta-ig | cpc | launch_2026q2 |
| X (Twitter) | x | cpc | launch_2026q2 |
| Yahoo | yahoo | cpc | launch_2026q2 |

例: `https://demo.b-p.co.jp/?utm_source=google&utm_medium=cpc&utm_campaign=launch_2026q2&utm_content=ad_no1`

## ローンチチェックリスト

- [ ] Vercel に env var 追加: `NEXT_PUBLIC_GA4_ID=G-XXXXXXX`
- [ ] Vercel に env var 追加: `NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXX`
- [ ] (任意) `NEXT_PUBLIC_X_PIXEL_ID=XXXX`
- [ ] (任意) `SALES_NOTIFICATION_WEBHOOK=https://hooks.slack.com/...` で問合せ通知
- [ ] GA4 で「Conversion: contact_sales_submit」を設定
- [ ] Meta Events Manager で Lead イベントを Conversion 登録
- [ ] Google Ads キャンペーン作成 → demo.b-p.co.jp に UTM 付き URL を Final URL に
- [ ] 1 日 ¥1,000〜¥3,000 でテスト → CTR / CVR で勝ち案を絞る
