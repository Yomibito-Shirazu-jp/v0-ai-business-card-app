import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE_MS = 6 * 60 * 60 * 1000 // 6 時間

type NewsItem = {
  title: string
  url: string
  published_at: string | null
  source: string
}

function decodeEntities(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of itemMatches) {
    const block = m[1]
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? ''
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? ''
    const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? ''
    items.push({
      title: decodeEntities(titleRaw),
      url: link,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      source: decodeEntities(sourceRaw),
    })
    if (items.length >= 5) break
  }
  return items
}

export async function GET(req: Request) {
  const companyName = new URL(req.url).searchParams.get('company')?.trim()
  if (!companyName) {
    return NextResponse.json({ error: 'company required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) {
    return NextResponse.json({ error: 'employee not found' }, { status: 401 })
  }

  const { data: cached } = await supabase
    .from('company_profiles')
    .select('latest_news, news_fetched_at')
    .eq('company_id', emp.company_id)
    .ilike('company_name', companyName)
    .maybeSingle()

  if (
    cached?.news_fetched_at &&
    Date.now() - new Date(cached.news_fetched_at).getTime() < CACHE_MS &&
    Array.isArray(cached.latest_news)
  ) {
    return NextResponse.json({ news: cached.latest_news, cached: true })
  }

  let items: NewsItem[] = []
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      companyName,
    )}&hl=ja&gl=JP&ceid=JP:ja`
    const res = await fetch(rssUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; meishiplus-bot)' },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      const xml = await res.text()
      items = parseRssItems(xml)
    }
  } catch (err) {
    console.log('[v0] company-news fetch failed:', (err as Error).message)
  }

  await supabase.from('company_profiles').upsert(
    {
      company_id: emp.company_id,
      company_name: companyName,
      latest_news: items,
      news_fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,company_name' },
  )

  return NextResponse.json({ news: items, cached: false })
}
