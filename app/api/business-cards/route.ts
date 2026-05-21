import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OCRResult } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const ocrResult: OCRResult = body.ocrResult
    const imageUrl: string | undefined = body.imageUrl

    // バリデーション
    if (!ocrResult || typeof ocrResult.raw_text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OCRデータが不正です' },
        { status: 400 }
      )
    }

    // DBに保存
    const { data, error } = await supabase
      .from('business_cards')
      .insert({
        user_id: user.id,
        full_name: ocrResult.full_name || null,
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
      console.error('DB insert error:', error)
      return NextResponse.json(
        { success: false, error: `保存に失敗しました: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 名刺一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('business_cards')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data, count })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 }
    )
  }
}
