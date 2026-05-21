import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 社員更新 (owner/admin or 本人のプロフィールのみ)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
  }

  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentEmployee) {
    return NextResponse.json({ success: false, error: '社員登録がありません' }, { status: 403 })
  }

  // 対象社員の存在確認
  const { data: targetEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('id', id)
    .single()

  if (!targetEmployee || targetEmployee.company_id !== currentEmployee.company_id) {
    return NextResponse.json({ success: false, error: '社員が見つかりません' }, { status: 404 })
  }

  const body = await request.json()
  const isAdmin = ['owner', 'admin'].includes(currentEmployee.role)
  const isSelf = currentEmployee.id === id

  // 本人でもadminでもない場合は更新不可
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ success: false, error: '更新権限がありません' }, { status: 403 })
  }

  // 更新可能フィールドを制限
  const allowedFields: Record<string, unknown> = {}

  // 本人が更新可能なフィールド
  if (isSelf || isAdmin) {
    if (body.display_name !== undefined) allowedFields.display_name = body.display_name
    if (body.display_name_kana !== undefined) allowedFields.display_name_kana = body.display_name_kana
    if (body.phone !== undefined) allowedFields.phone = body.phone
    if (body.mobile !== undefined) allowedFields.mobile = body.mobile
  }

  // admin/ownerのみ更新可能なフィールド
  if (isAdmin) {
    if (body.department !== undefined) allowedFields.department = body.department
    if (body.position !== undefined) allowedFields.position = body.position
    if (body.staff_id !== undefined) allowedFields.staff_id = body.staff_id
    if (body.status !== undefined) {
      // statusの変更制限
      if (body.status === 'suspended' || body.status === 'invited' || body.status === 'active') {
        // ownerのstatusはownerのみ変更可能
        if (targetEmployee.role === 'owner' && currentEmployee.role !== 'owner') {
          return NextResponse.json({ success: false, error: 'ownerのステータス変更はownerのみ可能です' }, { status: 403 })
        }
        allowedFields.status = body.status
      }
    }
    if (body.role !== undefined) {
      // roleの変更制限
      if (['owner', 'admin', 'member'].includes(body.role)) {
        // ownerへの昇格/からの降格はownerのみ
        if ((body.role === 'owner' || targetEmployee.role === 'owner') && currentEmployee.role !== 'owner') {
          return NextResponse.json({ success: false, error: 'owner権限の変更はownerのみ可能です' }, { status: 403 })
        }
        allowedFields.role = body.role
      }
    }
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ success: false, error: '更新するフィールドがありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employees')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

// 社員削除 (owner/adminのみ、ただしownerは削除不可)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
  }

  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentEmployee) {
    return NextResponse.json({ success: false, error: '社員登録がありません' }, { status: 403 })
  }

  if (!['owner', 'admin'].includes(currentEmployee.role)) {
    return NextResponse.json({ success: false, error: '削除権限がありません' }, { status: 403 })
  }

  // 対象社員の存在確認
  const { data: targetEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('id', id)
    .single()

  if (!targetEmployee || targetEmployee.company_id !== currentEmployee.company_id) {
    return NextResponse.json({ success: false, error: '社員が見つかりません' }, { status: 404 })
  }

  // ownerは削除不可
  if (targetEmployee.role === 'owner') {
    return NextResponse.json({ success: false, error: 'ownerは削除できません' }, { status: 403 })
  }

  // 自分自身は削除不可
  if (targetEmployee.id === currentEmployee.id) {
    return NextResponse.json({ success: false, error: '自分自身は削除できません' }, { status: 403 })
  }

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
