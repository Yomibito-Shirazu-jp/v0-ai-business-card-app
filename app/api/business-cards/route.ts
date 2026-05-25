import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OCRResult } from '@/lib/supabase/types'
import { DEMO_BUSINESS_CARDS, isDemoMode } from '@/lib/demo-data'

// 会社名刺帳モデル:
//   - RLS が company_id を強制
//   - employees レコードが active なユーザーのみ書き込み可
//   - 表示は同社員全員が共有
//
// 旧 user_id ベース API からの移行:
//   - DB の user_id カラムは互換のため残置(NOT NULL なので埋める)
//   - 新カラム name/name_kana にも書き込む

export async function POST(request: NextRequest) {
  // デモモードでは保存したふりをして返す
  if (isDemoMode()) {
    const body = await request.json()
    const newCard = {
      id: `demo-card-${Date.now()}`,
      ...body.ocrResult,
      ...body.manualEntry,
      employee_id: 'demo-emp-001',
      company_id: 'demo-company-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
    }
    return NextResponse.json({ success: true, data: newCard })
  }

  try {
    const supabase = await createClient()

    // 認証
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 },
      )
    }

    // 現在の社員レコード
    const { data: employee } = await supabase
      .from('employees')
      .select('id, company_id, status')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!employee) {
      return NextResponse.json(
        { success: false, error: '社員登録がありません。社長にお問い合わせください。' },
        { status: 403 },
      )
    }

    const body = await request.json()
    
    // 手動入力の場合
    if (body.manualEntry) {
      const entry = body.manualEntry
      const { data, error } = await supabase
        .from('business_cards')
        .insert({
          company_id: employee.company_id,
          owner_employee_id: employee.id,
          user_id: user.id,
          source: 'manual',
          full_name: entry.full_name || null,
          full_name_kana: entry.full_name_kana || null,
          company_name: entry.company_name || null,
          department: entry.department || null,
          position: entry.position || null,
          email: entry.email || null,
          phone: entry.phone || null,
          mobile: entry.mobile || null,
          address: entry.address || null,
          website: entry.website || null,
          notes: entry.notes || null,
          tags: [],
          is_favorite: false,
          relationship_strength: 50,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: `保存に失敗しました: ${error.message}` },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, data })
    }

    // OCR結果からの保存
    const ocrResult: OCRResult = body.ocrResult
    const imageUrl: string | undefined = body.imageUrl
    const isPrivate: boolean = body.isPrivate === true

    if (!ocrResult || typeof ocrResult.raw_text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OCRデータが不正です' },
        { status: 400 },
      )
    }

    // 保存 (RLS により company_id は employee.company_id と一致するもののみ)
    const { data, error } = await supabase
      .from('business_cards')
      .insert({
        company_id: employee.company_id,
        owner_employee_id: employee.id,
        user_id: user.id,                        // 旧スキーマ互換のため保持
        is_private: isPrivate,
        source: imageUrl ? 'image' : 'manual',
        name: ocrResult.full_name || null,
        name_kana: ocrResult.full_name_kana || null,
        full_name: ocrResult.full_name || null,   // 旧カラム互換
        full_name_kana: ocrResult.full_name_kana || null,
        company_name: ocrResult.company_name || null,
        company_name_kana: ocrResult.company_name_kana || null,
        department: ocrResult.department || null,
        position: ocrResult.position || null,
        email: ocrResult.email || null,
        phone: ocrResult.phone || null,
        mobile: ocrResult.mobile || null,
        fax: ocrResult.fax || null,
        postal_code: ocrResult.postal_code || null,
        address: ocrResult.address || null,
        address_raw: ocrResult.address || null,
        website: ocrResult.website || null,
        linkedin: ocrResult.linkedin || null,
        twitter: ocrResult.twitter || null,
        facebook: ocrResult.facebook || null,
        ocr_raw_text: ocrResult.raw_text,
        ocr_confidence: ocrResult.confidence,
        image_url: imageUrl || null,
        tags: [],
        is_favorite: false,
        relationship_strength: 50,
      })
      .select()
      .single()

    if (error) {
      console.error('[business-cards POST] insert error:', error)
      return NextResponse.json(
        { success: false, error: `保存に失敗しました: ${error.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[business-cards POST] error:', error)
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 },
    )
  }
}

// 名刺一覧取得(会社名刺帳)
export async function GET(request: NextRequest) {
  // デモモードではモックデータを返す
  if (isDemoMode()) {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    let cards = [...DEMO_BUSINESS_CARDS]
    if (search) {
      cards = cards.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(search) ||
          c.company_name?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search),
      )
    }
    return NextResponse.json({ success: true, data: cards, count: cards.length })
  }

  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const scope = searchParams.get('scope') || 'company' // 'company' | 'mine'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 自分のemployeeレコード (scope=mine 用)
    let currentEmployeeId: string | null = null
    if (scope === 'mine') {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .single()
      currentEmployeeId = emp?.id ?? null
    }

    // RLS が company_id を自動でフィルタ
    let query = supabase
      .from('business_cards')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (scope === 'mine') {
      if (!currentEmployeeId) {
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
      query = query.eq('owner_employee_id', currentEmployeeId)
    }

    if (search) {
      // 名前・かな・会社名・メールを横断 OR 検索
      const esc = search.replace(/[%_,()]/g, '\\$&')
      query = query.or(
        `name.ilike.%${esc}%,name_kana.ilike.%${esc}%,full_name.ilike.%${esc}%,full_name_kana.ilike.%${esc}%,company_name.ilike.%${esc}%,email.ilike.%${esc}%`,
      )
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[business-cards GET] query error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data, count })
  } catch (error) {
    console.error('[business-cards GET] error:', error)
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 },
    )
  }
}
