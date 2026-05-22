// Document OCR の raw_text を正規表現＋ルールベースで OCRResult に整形する。
// Gemini / 外部 AI に依存しない。日本語名刺を主ターゲットに、英文も最低限カバー。
import type { OCRResult } from './supabase/types'

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const RE_URL = /https?:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/i
const RE_POSTAL = /〒?\s*(\d{3})[-－ー]?(\d{4})/
const RE_PHONE_LIKE = /(?:TEL|電話|☎|Tel|Phone)?\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0\d{1,4}|\(\d{1,4}\))[\s-]?\d{1,4}[\s-]?\d{3,4})/i
const RE_FAX = /(?:FAX|Fax|ファックス|ファクス)\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0\d{1,4}|\(\d{1,4}\))[\s-]?\d{1,4}[\s-]?\d{3,4})/i
const RE_MOBILE = /(?:Mobile|Mob|携帯|モバイル|スマホ)\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0[789]0[\s-]?\d{4}[\s-]?\d{4}|\(\d{1,4}\)[\s-]?\d{1,4}[\s-]?\d{3,4}))/i
const RE_GENERIC_PHONE = /((?:\+?\d{1,3}[\s-])?(?:0[789]0[\s-]?\d{4}[\s-]?\d{4}|0\d{1,4}[\s-]\d{1,4}[\s-]\d{3,4}|\(0\d{1,4}\)[\s-]?\d{1,4}[\s-]?\d{3,4}))/

const POSITIONS = [
  '代表取締役社長','代表取締役','取締役会長','取締役','執行役員','常務執行役員','常務','専務',
  '部長','次長','課長','係長','主任','マネージャー','ディレクター','チーフ',
  '所長','工場長','店長','支店長','室長','本部長','事業部長','局長','顧問','社外取締役',
  'CEO','COO','CTO','CFO','CMO','CIO','President','Director','Manager','Executive','Officer','Chief','Lead','Head','Engineer','Designer','Producer',
]
const DEPT_KEYWORDS = ['営業','製造','技術','開発','企画','事業','経営','管理','人事','総務','経理','財務','広報','マーケティング','法務','情報システム','編集','編成','制作','業務','カスタマー','サポート','品質','研究','物流','調達','購買']
// 「○○部」「○○課」「○○室」「○○本部」「○○グループ」「○○チーム」もキャプチャ
const RE_DEPT = new RegExp(
  `((?:${DEPT_KEYWORDS.join('|')})[一-龥ぁ-んァ-ヶa-zA-Z0-9・/　\\s-]{0,30}?(?:本部|事業部|部|課|室|グループ|チーム|G|セクション|ユニット|統括|戦略|推進室?))`,
)

const COMPANY_SUFFIXES = [
  '株式会社','有限会社','合同会社','合資会社','合名会社','一般社団法人','公益社団法人','一般財団法人','公益財団法人','学校法人','医療法人','社会福祉法人','宗教法人','独立行政法人','国立大学法人','特定非営利活動法人','NPO法人',
  'Co\\., ?Ltd\\.','Corporation','Corp\\.','Inc\\.','Ltd\\.','LLC','GmbH','S\\.A\\.','Pty\\.',
]
const RE_COMPANY = new RegExp(
  `((?:[一-龥ぁ-んァ-ヶa-zA-Z0-9&・\\s-]{1,40})(?:${COMPANY_SUFFIXES.join('|')})|(?:${COMPANY_SUFFIXES.join('|')})[一-龥ぁ-んァ-ヶa-zA-Z0-9&・\\s-]{1,40})`,
)

const RE_KANA_LINE = /^[\s　ぁ-んァ-ヶー\sA-Za-z]+$/

function pickFirst<T>(arr: (T | undefined | null | '')[]): T | undefined {
  for (const v of arr) if (v) return v as T
  return undefined
}

function normalizePhone(s: string | undefined): string | undefined {
  if (!s) return undefined
  const t = s.replace(/[（(]/g, '(').replace(/[）)]/g, ')').replace(/\s+/g, ' ').trim()
  return t.length > 0 ? t : undefined
}

export function parseBusinessCardRawText(rawText: string): OCRResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const joined = lines.join('\n')

  // email / url
  const email = joined.match(RE_EMAIL)?.[0]
  const website = (() => {
    const u = joined.match(RE_URL)?.[0]
    if (!u) return undefined
    if (email && u.includes(email)) return undefined
    return u
  })()
  // 郵便番号
  const postalMatch = joined.match(RE_POSTAL)
  const postal_code = postalMatch ? `${postalMatch[1]}-${postalMatch[2]}` : undefined

  // 電話/FAX/モバイル
  const fax = normalizePhone(joined.match(RE_FAX)?.[1])
  const mobile = normalizePhone(joined.match(RE_MOBILE)?.[1])
  // phone は FAX/Mobile 行と重複しないように除外して取得
  let phone: string | undefined
  for (const line of lines) {
    if (/FAX|Fax|ファックス|ファクス/.test(line)) continue
    if (/Mobile|Mob|携帯|モバイル|スマホ/.test(line)) continue
    const m = line.match(RE_PHONE_LIKE) || line.match(RE_GENERIC_PHONE)
    if (m) {
      phone = normalizePhone(m[1])
      break
    }
  }

  // 会社名
  const companyMatch = joined.match(RE_COMPANY)
  const company_name = companyMatch ? companyMatch[1].trim() : undefined

  // 部署
  const deptMatch = joined.match(RE_DEPT)
  const department = deptMatch ? deptMatch[1].trim() : undefined

  // 役職
  let position: string | undefined
  for (const p of POSITIONS) {
    const re = new RegExp(p, 'i')
    if (re.test(joined)) {
      position = p
      break
    }
  }

  // 住所: 都道府県以降を含む行
  const RE_ADDRESS = /((?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)[^\n]+)/
  const addressMatch = joined.match(RE_ADDRESS)
  const address = addressMatch ? addressMatch[1].replace(/〒?\s*\d{3}[-－ー]?\d{4}\s*/, '').trim() : undefined

  // 氏名: メール/会社/役職/住所/電話番号を含まない、漢字 2〜4 文字 + ASCII スペース許容の行を上から探す
  let full_name: string | undefined
  let full_name_kana: string | undefined
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.length > 24) continue
    if (RE_EMAIL.test(line)) continue
    if (RE_URL.test(line)) continue
    if (RE_GENERIC_PHONE.test(line)) continue
    if (RE_POSTAL.test(line)) continue
    if (company_name && line.includes(company_name)) continue
    if (department && line.includes(department)) continue
    if (position && line.includes(position)) continue
    if (address && line.includes(address.slice(0, 6))) continue
    // 漢字 + ひらがな + 空白だけの 2〜12 文字
    if (/^[一-鿿ぁ-んァ-ヶa-zA-Z][一-鿿ぁ-んァ-ヶa-zA-Z\s　]{1,10}$/.test(line) &&
        /[一-鿿]/.test(line)) {
      full_name = line.replace(/\s+/g, ' ').trim()
      // 次行がふりがなっぽければ採用
      const next = lines[i + 1]
      if (next && RE_KANA_LINE.test(next) && next.length <= 24) {
        full_name_kana = next.replace(/\s+/g, ' ').trim()
      }
      break
    }
  }

  // 会社名カナ
  let company_name_kana: string | undefined
  if (company_name) {
    const idx = lines.findIndex((l) => l.includes(company_name))
    if (idx >= 0) {
      const prev = lines[idx - 1]
      if (prev && RE_KANA_LINE.test(prev) && prev.length <= 40) {
        company_name_kana = prev.trim()
      }
    }
  }

  // confidence は抽出できたフィールド数から算出 (0.3〜0.9)
  const found = [full_name, company_name, email, phone, address, position].filter(Boolean).length
  const confidence = Math.min(0.3 + found * 0.1, 0.9)

  return {
    full_name,
    full_name_kana,
    company_name,
    company_name_kana,
    department,
    position,
    email,
    phone,
    mobile,
    fax,
    postal_code,
    address,
    website,
    linkedin: undefined,
    twitter: undefined,
    facebook: undefined,
    raw_text: rawText,
    confidence,
  }
}
