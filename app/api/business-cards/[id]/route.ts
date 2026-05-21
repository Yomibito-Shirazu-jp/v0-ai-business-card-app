import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 単票取得・更新・削除(会社名刺帳モデル)
// RLS が「同 company_id 内のみ可、private なら所有者のみ、削除は所有者 or admin/owner ロールのみ」を担保

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('business_cards')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    // 監査ログ
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()
    if (emp) {
      await supabase.from('access_log').insert({
        business_card_id: id,
        employee_id: emp.id,
        action: 'view',
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[business-cards/:id GET] error:', error)
    return NextResponse.json({ success: false, error: '予期せぬエラーが発生しました' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    // 危険な列(company_id, owner_employee_id, user_id, id 等)はホワイトリストで弾く
    const allowedKeys = new Set([
      'name', 'name_kana', 'full_name', 'full_name_kana',
      'company_name', 'company_name_kana',
      'department', 'position',
      'email', 'phone', 'mobile', 'fax',
      'postal_code', 'address', 'address_raw',
      'address_postal_code', 'address_prefecture', 'address_city', 'address_line', 'address_building',
      'website', 'linkedin', 'twitter', 'facebook',
      'tags', 'notes',
      'is_favorite', 'is_private',
      'relationship_type', 'relationship_strength',
      'last_contacted_at',
    ])
    const safeUpdate: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (allowedKeys.has(k)) safeUpdate[k] = v
    }

    const { data, error } = await supabase
      .from('business_cards')
      .update(safeUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 監査ログ
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()
    if (emp) {
      await supabase.from('access_log').insert({
        business_card_id: id,
        employee_id: emp.id,
        action: 'update',
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[business-cards/:id PATCH] error:', error)
    return NextResponse.json({ success: false, error: '予期せぬエラーが発生しました' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const { error } = await supabase
      .from('business_cards')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[business-cards/:id DELETE] error:', error)
    return NextResponse.json({ success: false, error: '予期せぬエラーが発生しました' }, { status: 500 })
  }
}
