'use client'

import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, ExternalLink, Newspaper } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Profile = {
  industry: string | null
  description: string | null
  hq_address: string | null
  website: string | null
  employee_size: string | null
  is_listed: boolean | null
  established: string | null
}

type NewsItem = {
  title: string
  url: string
  published_at: string | null
  source: string
}

function formatDate(s: string | null) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function CompanyInfoSection({ companyName }: { companyName: string }) {
  const { data, isLoading } = useSWR<{
    profile: Profile | null
    cached: boolean
    ai_unavailable?: boolean
  }>(
    companyName ? `/api/company-profile?company=${encodeURIComponent(companyName)}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          企業情報
        </h3>
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const p = data?.profile
  if (!p || (!p.industry && !p.description && !p.hq_address && !p.website && !p.employee_size && !p.established && p.is_listed === null)) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Building2 className="w-4 h-4" />
        企業情報
      </h3>
      <div className="text-sm space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {p.industry && <Badge variant="secondary">{p.industry}</Badge>}
          {p.employee_size && <Badge variant="outline">{p.employee_size}</Badge>}
          {p.is_listed !== null && (
            <Badge variant="outline">{p.is_listed ? '上場' : '非上場'}</Badge>
          )}
          {p.established && <Badge variant="outline">設立 {p.established}</Badge>}
        </div>
        {p.description && (
          <p className="text-muted-foreground text-xs leading-relaxed">{p.description}</p>
        )}
        {p.hq_address && (
          <p className="text-xs text-muted-foreground">本社: {p.hq_address}</p>
        )}
        {p.website && (
          <a
            href={p.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs underline inline-flex items-center gap-1 break-all"
          >
            {p.website}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

export function CompanyNewsSection({ companyName }: { companyName: string }) {
  const { data, isLoading } = useSWR<{ news: NewsItem[]; cached: boolean }>(
    companyName ? `/api/company-news?company=${encodeURIComponent(companyName)}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Newspaper className="w-4 h-4" />
          最新ニュース
        </h3>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const news = data?.news ?? []
  if (news.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Newspaper className="w-4 h-4" />
        最新ニュース
      </h3>
      <ul className="space-y-2">
        {news.map((n, i) => (
          <li key={i} className="text-xs">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:bg-muted/50 rounded p-2 -mx-2 transition-colors"
            >
              <div className="font-medium text-foreground line-clamp-2">{n.title}</div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1.5">
                {n.source && <span>{n.source}</span>}
                {n.source && n.published_at && <span>·</span>}
                {n.published_at && <span>{formatDate(n.published_at)}</span>}
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
