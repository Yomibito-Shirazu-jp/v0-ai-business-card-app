// Document OCR の raw_text を正規表現＋スコアリングで OCRResult に整形する。
// Gemini が利用不可のときの fallback。日本語名刺を主ターゲット。
import type { OCRResult } from './supabase/types'

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const RE_URL = /https?:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/i
const RE_POSTAL = /〒?\s*(\d{3})[-－ー]?(\d{4})/
const RE_PHONE_LIKE = /(?:TEL|電話|☎|Tel|Phone)\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0\d{1,4}|\(\d{1,4}\))[\s-]?\d{1,4}[\s-]?\d{3,4})/i
const RE_FAX = /(?:FAX|Fax|ファックス|ファクス)\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0\d{1,4}|\(\d{1,4}\))[\s-]?\d{1,4}[\s-]?\d{3,4})/i
const RE_MOBILE = /(?:Mobile|Mob|携帯|モバイル|スマホ)\s*[:：]?\s*((?:\+?\d{1,3}[\s-])?(?:0[789]0[\s-]?\d{4}[\s-]?\d{4}|\(\d{1,4}\)[\s-]?\d{1,4}[\s-]?\d{3,4}))/i
const RE_GENERIC_PHONE = /((?:\+?\d{1,3}[\s-])?(?:0[789]0[\s-]?\d{4}[\s-]?\d{4}|0\d{1,4}[\s-]\d{1,4}[\s-]\d{3,4}|\(0\d{1,4}\)[\s-]?\d{1,4}[\s-]?\d{3,4}))/

const POSITIONS = [
  '代表取締役社長','代表取締役','取締役会長','取締役','執行役員','常務執行役員','常務','専務',
  '部長','次長','課長','係長','主任','マネージャー','ディレクター','チーフ',
  '所長','工場長','店長','支店長','室長','本部長','事業部長','局長','顧問','社外取締役','理事長','理事','監事',
  'CEO','COO','CTO','CFO','CMO','CIO','President','Director','Manager','Executive','Officer','Chief','Lead','Head','Engineer','Designer','Producer',
]
const DEPT_KEYWORDS = ['営業','製造','技術','開発','企画','事業','経営','管理','人事','総務','経理','財務','広報','マーケティング','法務','情報システム','編集','編成','制作','業務','カスタマー','サポート','品質','研究','物流','調達','購買']
const RE_DEPT = new RegExp(
  `((?:${DEPT_KEYWORDS.join('|')})[一-龥ぁ-んァ-ヶa-zA-Z0-9・/　\\s-]{0,30}?(?:本部|事業部|部|課|室|グループ|チーム|G|セクション|ユニット|統括|戦略|推進室?))`,
)

// 会社名サフィックス＋プレフィックス
const COMPANY_SUFFIXES = [
  '株式会社','有限会社','合同会社','合資会社','合名会社','一般社団法人','公益社団法人','一般財団法人','公益財団法人','学校法人','医療法人','社会福祉法人','宗教法人','独立行政法人','国立大学法人','特定非営利活動法人','NPO法人',
  'Co\\., ?Ltd\\.','Corporation','Corp\\.','Inc\\.','Ltd\\.','LLC','GmbH','S\\.A\\.','Pty\\.',
]
const RE_COMPANY = new RegExp(
  `((?:[一-龥ぁ-んァ-ヶa-zA-Z0-9&・\\s-]{1,40})(?:${COMPANY_SUFFIXES.join('|')})|(?:${COMPANY_SUFFIXES.join('|')})[一-龥ぁ-んァ-ヶa-zA-Z0-9&・\\s-]{1,40})`,
)

// 氏名候補から除外すべきキーワード（部分一致）
const NAME_EXCLUDE_KEYWORDS = [
  // 法人プレフィックス
  '法人','株式会社','有限会社','合同会社','合資会社','合名会社','一般社団','公益社団','一般財団','公益財団',
  '学校法人','医療法人','社会福祉','宗教法人','独立行政','国立大学','特定非営利','NPO',
  // 支社・支店・営業所
  '支社','支店','支所','本社','営業所','工場','事業所','事務所','本部','研究所','センター','店',
  // 部署
  '営業部','製造部','技術部','開発部','企画部','人事部','総務部','経理部','財務部','広報部','マーケティング部','法務部',
  '営業課','製造課','技術課','開発課','企画課','人事課','総務課','経理課',
  // 役職(役職単独行は除外)
  '代表取締役','取締役','執行役員','部長','次長','課長','係長','主任','マネージャー','ディレクター','所長','工場長','店長','支店長','室長','本部長','事業部長','理事',
  // よくあるスローガン断片
  '私たちの','ミッション','ビジョン','バリュー','を提供','を実現','目指す','MISSION','VISION','VALUES',
  // 連絡先キーワード
  'TEL','FAX','Tel','Fax','Email','E-mail','HP','URL','Mobile','携帯',
  '〒',
  // 国名・都道府県(住所行誤検知の防止)
  '東京都','大阪府','京都府','北海道','道','県','市','区','町','村','番地','丁目',
]

const RE_KANA_LINE = /^[\s　ぁ-んァ-ヶー]+$/
const RE_HAS_KANJI = /[一-鿿々]/
const RE_HAS_HIRAGANA = /[ぁ-ん]/
const RE_HAS_DIGITS_3 = /\d.*\d.*\d/

function pickFirst<T>(arr: (T | undefined | null | '')[]): T | undefined {
  for (const v of arr) if (v) return v as T
  return undefined
}

function normalizePhone(s: string | undefined): string | undefined {
  if (!s) return undefined
  const t = s.replace(/[（(]/g, '(').replace(/[）)]/g, ')').replace(/\s+/g, ' ').trim()
  return t.length > 0 ? t : undefined
}

function isLikelyName(line: string): boolean {
  if (!line || line.length < 2 || line.length > 18) return false
  if (RE_HAS_DIGITS_3.test(line)) return false
  if (RE_EMAIL.test(line)) return false
  if (RE_URL.test(line)) return false
  if (RE_GENERIC_PHONE.test(line)) return false
  if (RE_POSTAL.test(line)) return false
  for (const kw of NAME_EXCLUDE_KEYWORDS) {
    if (line.includes(kw)) return false
  }
  // 漢字が 2 文字以上含まれる
  const kanjiCount = (line.match(/[一-鿿々]/g) || []).length
  if (kanjiCount < 2) return false
  // 英字主体の長文(役職など)は弾く
  const asciiCount = (line.match(/[A-Za-z]/g) || []).length
  if (asciiCount > line.length * 0.6) return false
  return true
}

function scoreName(line: string, lineIndex: number, total: number): number {
  let score = 0
  // 「姓 名」形式（スペース挟みの 2 ブロック）
  if (/^[一-鿿々]{1,5}[\s　][一-鿿々]{1,5}$/.test(line)) score += 5
  // 4 文字漢字ブロック
  else if (/^[一-鿿々]{2,4}$/.test(line)) score += 3
  // 上の方が氏名らしい
  score += Math.max(0, 3 - lineIndex / Math.max(total, 1) * 3)
  // 短いほうがらしい
  if (line.length <= 6) score += 2
  else if (line.length <= 10) score += 1
  return score
}

export function parseBusinessCardRawText(rawText: string): OCRResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const joined = lines.join('\n')

  const email = joined.match(RE_EMAIL)?.[0]
  const website = (() => {
    const u = joined.match(RE_URL)?.[0]
    if (!u) return undefined
    if (email && u.includes(email)) return undefined
    return u
  })()

  const postalMatch = joined.match(RE_POSTAL)
  const postal_code = postalMatch ? `${postalMatch[1]}-${postalMatch[2]}` : undefined

  const fax = normalizePhone(joined.match(RE_FAX)?.[1])
  const mobile = normalizePhone(joined.match(RE_MOBILE)?.[1])
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

  const companyMatch = joined.match(RE_COMPANY)
  const company_name = companyMatch ? companyMatch[1].trim() : undefined

  const deptMatch = joined.match(RE_DEPT)
  const department = deptMatch ? deptMatch[1].trim() : undefined

  let position: string | undefined
  for (const p of POSITIONS) {
    const re = new RegExp(p, 'i')
    if (re.test(joined)) { position = p; break }
  }

  const RE_ADDRESS = /((?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)[^\n]+)/
  const addressMatch = joined.match(RE_ADDRESS)
  const address = addressMatch ? addressMatch[1].replace(/〒?\s*\d{3}[-－ー]?\d{4}\s*/, '').trim() : undefined

  // 氏名候補を全行スコアリングで決める
  let full_name: string | undefined
  let full_name_kana: string | undefined
  const candidates: { line: string; idx: number; score: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!isLikelyName(line)) continue
    if (company_name && line.includes(company_name.slice(0, 4))) continue
    if (department && line.includes(department.slice(0, 4))) continue
    if (address && line.includes(address.slice(0, 6))) continue
    if (position && line.includes(position)) continue
    candidates.push({ line, idx: i, score: scoreName(line, i, lines.length) })
  }
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  if (best) {
    full_name = best.line.replace(/\s+/g, ' ').trim()
    const next = lines[best.idx + 1]
    if (next && RE_KANA_LINE.test(next) && next.length <= 24) {
      full_name_kana = next.replace(/\s+/g, ' ').trim()
    }
  }

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

  const found = [full_name, company_name, email, phone, address, position].filter(Boolean).length
  const confidence = Math.min(0.3 + found * 0.08, 0.85)

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
