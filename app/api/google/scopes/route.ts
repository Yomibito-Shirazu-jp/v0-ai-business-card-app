import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { DEMO_GOOGLE_SCOPES, isDemoMode } from "@/lib/demo-data"

const SCOPE_BY_SERVICE = {
  contacts: 'https://www.googleapis.com/auth/contacts.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  drive: 'https://www.googleapis.com/auth/drive.metadata.readonly',
} as const

// セッションの provider_token を最優先、無ければ employees.google_access_token を使う。
// expire していれば refresh_token で更新を試みる。
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json(DEMO_GOOGLE_SCOPES)
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      hasGoogleAuth: false, contacts: false, calendar: false, gmail: false, drive: false, email: null,
    })
  }

  // employees から保存済みトークン
  const { data: emp } = await supabase
    .from('employees')
    .select('id, email, google_access_token, google_refresh_token, google_token_expires_at, google_granted_scopes')
    .eq('auth_user_id', user.id)
    .single()

  let accessToken: string | null = session?.provider_token || emp?.google_access_token || null
  let expired = false

  // セッショントークン優先。無くて DB トークンしか無い時は期限を確認
  if (!session?.provider_token && emp?.google_access_token && emp?.google_token_expires_at) {
    const exp = new Date(emp.google_token_expires_at).getTime()
    if (exp < Date.now() + 60_000) {
      // 期限切れ間近 → refresh
      if (emp.google_refresh_token) {
        try {
          const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
          const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
          if (clientId && clientSecret) {
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
              const rdata = await refreshRes.json() as { access_token: string; expires_in: number; scope: string }
              accessToken = rdata.access_token
              const newExp = new Date(Date.now() + (rdata.expires_in || 3600) * 1000).toISOString()
              await supabase.from('employees').update({
                google_access_token: rdata.access_token,
                google_token_expires_at: newExp,
                google_granted_scopes: (rdata.scope || '').split(' ').filter(Boolean),
              }).eq('id', emp.id)
              expired = false
            } else {
              expired = true
              accessToken = null
            }
          } else {
            // クライアントクレデンシャル未設定 → refresh できないが、保存スコープから推定
            expired = true
          }
        } catch {
          expired = true
        }
      } else {
        expired = true
      }
    }
  }

  // accessToken が無いなら未接続
  if (!accessToken) {
    return NextResponse.json({
      hasGoogleAuth: !!(emp?.google_granted_scopes && emp.google_granted_scopes.length > 0),
      tokenExpired: expired,
      contacts: false, calendar: false, gmail: false, drive: false,
      email: user.email,
      grantedScopes: emp?.google_granted_scopes || [],
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

      // セッショントークンが新しければ DB を更新しておく
      if (session?.provider_token && emp) {
        await supabase.from('employees').update({
          google_access_token: accessToken,
          google_token_expires_at: expIso,
          google_granted_scopes: grantedScopes,
          google_refresh_token: session.provider_refresh_token || emp.google_refresh_token,
        }).eq('id', emp.id)
      }
    } else {
      expired = true
    }
  } catch {
    expired = true
  }

  return NextResponse.json({
    hasGoogleAuth: !expired && accessToken !== null,
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
