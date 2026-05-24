"use client"

import { Shield, Lock, Eye, Award, FileText, Building2 } from "lucide-react"

export function TrustSection({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="w-4 h-4 text-emerald-600" />
        信頼と安心
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span><strong className="text-foreground">運営: 文唱堂印刷株式会社</strong> (創業 1933 年・東京)</span>
        </li>
        <li className="flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>AES-256 暗号化 / TLS 1.2+ / RLS で他社データ完全隔離</span>
        </li>
        <li className="flex items-start gap-2">
          <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>Gmail はメタデータのみ取得、<strong className="text-foreground">本文は読み取らず保存もしません</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <Award className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>Google OAuth 認証で 2 要素相当のセキュリティ</span>
        </li>
        {!compact && (
          <>
            <li className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>退会時はデータを 30 日以内に物理削除</span>
            </li>
            <li className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-border/50">
              <span>
                詳細: <a href="/terms" className="text-primary underline">利用規約</a> ・ <a href="/privacy" className="text-primary underline">プライバシーポリシー</a>
              </span>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
