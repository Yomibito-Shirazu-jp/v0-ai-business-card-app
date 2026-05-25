import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isDemoMode } from "@/lib/demo-data"

const SCOPE_BY_SERVICE = {
  contacts: 'https://www.googleapis.com/auth/contacts.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  drive: 'https://www.googleapis.com/auth/drive.metadata.readonly',
} as const

export type GoogleService = keyof typeof SCOPE_BY_SERVICE

// GET: 現在のGoogle OAuth scope一覧を取得
export async function GET() {
  // デモモードではGoogle連携なしとして返す
  if (isDemoMode()) {
    return NextResponse.json({
      hasGoogleAuth: false,
      contacts: false,
      calendar: false,
      gmail: false,
      drive: false,
      email: 'demo@example.com',
    })
  }

  const supabase = await createClient()
  
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  
  if (authError || !session) {
    return NextResponse.json({ 
      hasGoogleAuth: false,
      contacts: false, 
      calendar: false, 
      gmail: false, 
      drive: false,
      email: null,
    })
  }

  // provider_tokenがない場合
  if (!session.provider_token) {
    return NextResponse.json({ 
      hasGoogleAuth: false,
      contacts: false, 
      calendar: false, 
      gmail: false, 
      drive: false,
      email: session.user?.email || null,
    })
  }

  try {
    // Google tokeninfo エンドポイントで実際のスコープを確認
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${session.provider_token}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      // トークン期限切れ等
      return NextResponse.json({ 
        hasGoogleAuth: true,
        tokenExpired: true,
        contacts: false, 
        calendar: false, 
        gmail: false, 
        drive: false,
        email: session.user?.email || null,
      })
    }

    const data = await res.json()
    const grantedScopes = (data.scope as string ?? '').split(' ')

    return NextResponse.json({
      hasGoogleAuth: true,
      tokenExpired: false,
      contacts: grantedScopes.includes(SCOPE_BY_SERVICE.contacts),
      calendar: grantedScopes.includes(SCOPE_BY_SERVICE.calendar),
      gmail: grantedScopes.includes(SCOPE_BY_SERVICE.gmail),
      drive: grantedScopes.includes(SCOPE_BY_SERVICE.drive),
      email: data.email || session.user?.email || null,
      expiresAt: data.exp ? new Date(data.exp * 1000).toISOString() : null,
      grantedScopes,
    })
  } catch (error) {
    console.error('Google tokeninfo error:', error)
    return NextResponse.json({ 
      hasGoogleAuth: true,
      error: 'Failed to fetch token info',
      contacts: false, 
      calendar: false, 
      gmail: false, 
      drive: false,
      email: session.user?.email || null,
    })
  }
}
