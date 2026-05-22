// Google Service Account JWT → OAuth access token
// jose で RS256 署名し、oauth2.googleapis.com/token に交換する。
// 取得した token は 45 分メモリキャッシュ。
import { SignJWT, importPKCS8 } from 'jose'

interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri?: string
}

interface CachedToken {
  token: string
  exp: number
}

const cache = new Map<string, CachedToken>()

const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

export async function getGoogleAccessToken(
  serviceAccountJson: string,
  scope: string = DEFAULT_SCOPE,
): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Service Account JSON に client_email / private_key がありません')
  }

  const cacheKey = `${sa.client_email}|${scope}`
  const now = Math.floor(Date.now() / 1000)
  const cached = cache.get(cacheKey)
  if (cached && cached.exp - now > 60) {
    return cached.token
  }

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'

  // private_key は "\n" を実際の改行に置換しないと importPKCS8 が失敗する
  const pem = sa.private_key.replace(/\\n/g, '\n')
  const key = await importPKCS8(pem, 'RS256')

  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google OAuth トークン取得失敗 (${res.status}): ${body.slice(0, 400)}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  if (!data.access_token) {
    throw new Error('Google OAuth トークンが空です')
  }

  cache.set(cacheKey, {
    token: data.access_token,
    exp: now + (data.expires_in ?? 3600),
  })

  return data.access_token
}
