import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { DEMO_GOOGLE_SCOPES, isDemoMode } from "@/lib/demo-data"

const SCOPE_BY_SERVICE = {
  contacts: 'https://www.googleapis.com/auth/contacts.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  drive: 'https://www.googleapis.com/auth/drive.metadata.readonly',
} as const

const EMPTY_SCOPES = {
  hasGoogleAuth: false,
  contacts: false,
  calendar: false,
  gmail: false,
  drive: false,
  email: null as string | null,
}

// GET: Google OAuth スコープ取得
// 優先順:
//   1. session.provider_token (OAuth コールバック直後にしか取れない)
//   2. employees.google_access_token (DB に永続化済み)
//   3. refresh_token があり client credentials 設定済みなら refresh で更新
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json(DEMO_GOOGLE_SCOPES)
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(EMPTY_SCOPES)
  }

  // employees から保存済みトークン
  const { data: emp } = await supabase
    .from('employees')
    .select('id, email, google_access_token, google_refresh_token, google_token_expires_at, google_granted_scopes')
    .eq('auth_user_id', user.id)
    .single()

  let accessToken: string | null = session?.provider_token || emp?.google_access_token || null
  let expired = false

  // DB トークンしか無いときは期限を確認 → 必要なら refresh
  if (!session?.provider_token && emp?.google_access_token && emp?.google_token_expires_at) {
    const exp = new Date(emp.google_token_expires_at).getTime()
    if (exp < Date.now() + 60_000) {
      // 期限切れ間近 → refresh を試行
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
      if (emp.google_refresh_token && clientId && clientSecret) {
        try {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: emp.google_refresh_token,
              grant_type: 'refresh_token',
            }).toString(),
          })
          if (refreshRes.ok) {
            const rdata = await refreshRes.json() as { access_token: string; expires_in?: number; scope?: string }
            accessToken = rdata.access_token
            const newExp = new Date(Date.now() + (rdata.expires_in || 3600) * 1000).toISOString()
            const newScopes = (rdata.scope || '').split(' ').filter(Boolean)
            await supabase.from('employees').update({
              google_access_token: rdata.access_token,
              google_token_expires_at: newExp,
              ...(newScopes.length > 0 ? { google_granted_scopes: newScopes } : {}),
            }).eq('id', emp.id)
          } else {
            // refresh 失敗 (revoked など)
            expired = true
            accessToken = null
          }
        } catch {
          expired = true
        }
      } else {
        // refresh トークンか client credentials が無い → 期限切れ扱い
        expired = true
      }
    }
  }

  // accessToken が無いなら未接続 (ただし grantedScopes が DB にあれば「以前許可済み」として返す)
  if (!accessToken) {
    const dbScopes = emp?.google_granted_scopes || []
    return NextResponse.json({
      hasGoogleAuth: false,
      tokenExpired: expired,
      contacts: dbScopes.includes(SCOPE_BY_SERVICE.contacts),
      calendar: dbScopes.includes(SCOPE_BY_SERVICE.calendar),
      gmail: dbScopes.includes(SCOPE_BY_SERVICE.gmail),
      drive: dbScopes.includes(SCOPE_BY_SERVICE.drive),
      email: user.email,
      grantedScopes: dbScopes,
    })
  }

  // tokeninfo で実際のスコープを確認
  let grantedScopes: string[] = emp?.google_granted_scopes || []
  let tokenEmail = user.email
  let expIso: string | null = null
  try {
    const tiRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`, { cache: 'no-store' })
    if (tiRes.ok) {
      const tinfo = await tiRes.json() as { scope?: string; email?: string; exp?: number }
      grantedScopes = (tinfo.scope || '').split(' ').filter(Boolean)
      if (tinfo.email) tokenEmail = tinfo.email
      if (tinfo.exp) expIso = new Date(tinfo.exp * 1000).toISOString()

      // セッショントークンが新しければ DB を更新
      if (session?.provider_token && emp) {
        await supabase.from('employees').update({
          google_access_token: accessToken,
          google_token_expires_at: expIso,
          google_granted_scopes: grantedScopes,
          ...(session.provider_refresh_token ? { google_refresh_token: session.provider_refresh_token } : {}),
        }).eq('id', emp.id)
      }
    } else {
      // tokeninfo 失敗 → access_token が revoke されている
      expired = true
    }
  } catch {
    expired = true
  }

  return NextResponse.json({
    hasGoogleAuth: !expired,
    tokenExpired: expired,
    contacts: grantedScopes.includes(SCOPE_BY_SERVICE.contacts),
    calendar: grantedScopes.includes(SCOPE_BY_SERVICE.calendar),
    gmail: grantedScopes.includes(SCOPE_BY_SERVICE.gmail),
    drive: grantedScopes.includes(SCOPE_BY_SERVICE.drive),
    email: tokenEmail,
    expiresAt: expIso,
    grantedScopes,
  })
}
