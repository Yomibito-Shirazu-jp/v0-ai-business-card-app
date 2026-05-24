"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  Upload,
  Camera,
  LayoutGrid,
  List,
  Filter,
  MoreHorizontal,
  Star,
  StarOff,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Tag,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ExternalLink,
  Sparkles,
  ScanLine,
  FolderSync,
  Bell,
  CircleUser,
  Home,
  Briefcase,
  BarChart3,
  Trash2,
  Edit3,
  Share2,
  Download,
  CheckCircle2,
  Clock,
  Globe,
  Linkedin,
  Twitter,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { NetworkGraph } from "@/components/network-graph"
import { OverviewView } from "@/components/analytics/overview-view"
import { ContactsView } from "@/components/analytics/contacts-view"
import { ColdView } from "@/components/analytics/cold-view"
import { IndustryClassifyCard } from "@/components/admin/industry-classify-card"
import { CompanyInfoSection, CompanyNewsSection } from "@/components/company-enrichment"

// 型定義
interface BusinessCard {
  id: string
  name: string
  nameKana: string
  company: string
  department: string
  position: string
  email: string
  phone: string
  mobile?: string
  address?: string
  website?: string
  linkedin?: string
  twitter?: string
  notes?: string
  tags: string[]
  isFavorite: boolean
  createdAt: Date
  lastContactedAt?: Date
  imageUrl?: string
  syncedToGoogle: boolean
}

// Google Workspace連携サービス定義（Meetは削除）
const GOOGLE_SERVICES = [
  { key: 'contacts', name: 'Google Contacts', icon: Users, description: '取引先の連絡先を名刺と同期', scope: 'https://www.googleapis.com/auth/contacts.readonly' },
  { key: 'calendar', name: 'Google Calendar', icon: Calendar, description: '名刺から会議予定を作成・顧客との会議頻度分析', scope: 'https://www.googleapis.com/auth/calendar' },
  { key: 'gmail', name: 'Gmail', icon: Mail, description: '顧客とのメールやりとりを分析（本文は保存しない）', scope: 'https://www.googleapis.com/auth/gmail.readonly' },
  { key: 'drive', name: 'Google Drive', icon: FolderSync, description: '共有資料の頻度を分析（メタデータのみ）', scope: 'https://www.googleapis.com/auth/drive.metadata.readonly' },
] as const

// サイドバーナビゲーション
const sidebarNav = [
  { name: "ダッシュボード", icon: Home, href: "#", active: false, view: "dashboard" },
  { name: "マイ名刺帳", icon: Briefcase, href: "#", active: false, view: "cards_mine" },
  { name: "会社の名刺帳", icon: Briefcase, href: "#", active: true, view: "cards" },
  { name: "タグ管理", icon: Tag, href: "#", active: false, view: "tags" },
  { name: "アシスタント", icon: Sparkles, href: "/assistant", active: false, view: "assistant_link" },
  { name: "分析", icon: BarChart3, href: "#", active: false, view: "analytics" },
  { name: "社員管理", icon: Users, href: "#", active: false, view: "employees" },
  { name: "設定", icon: Settings, href: "#", active: false, view: "settings" },
]

// ネットワークノード/リンク生成は廃止（NetworkGraph 内で /api/analytics/network から取得）

export default function BusinessCardApp() {
  const [cards, setCards] = useState<BusinessCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)
  // スキャン後の確認モーダル用: OCR 完了直後、保存前にユーザーに見せる候補
  const [pendingScan, setPendingScan] = useState<{
    ocrResult: any
    imageBase64: string
    parser?: string
    geminiError?: string
  } | null>(null)
  const [pendingEdit, setPendingEdit] = useState<Record<string, string>>({})
  const [savingPending, setSavingPending] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState<string>("")
  const [scanError, setScanError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<string>("cards")
  // モバイル: サイドバーを Drawer (Sheet) で開閉
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  // ビューポートが md (>=768px) 未満かどうか。Sheet の overlay が desktop で誤って出る問題への対処。
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  const [analyticsTab, setAnalyticsTab] = useState<string>("overview")

  // URL クエリで初期ビュー/タブを反映（/network → analytics?tab=network のリダイレクト先など）
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const view = params.get("view")
    const tab = params.get("tab")
    if (view) setCurrentView(view)
    if (tab) setAnalyticsTab(tab)
  }, [])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCardForm, setNewCardForm] = useState({
    full_name: "", full_name_kana: "", company_name: "", department: "", position: "",
    email: "", phone: "", mobile: "", address: "", website: "", notes: ""
  })
  const pageSize = 50
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ユーザー情報取得（拡張版）
  const [currentUser, setCurrentUser] = useState<{
    id: string | null
    name: string
    nameKana: string
    email: string
    plan: string
    role: string | null
    avatarUrl: string | null
    phone: string | null
    mobile: string | null
    department: string | null
    position: string | null
    timezone: string
    language: string
    theme: string
    disabledGoogleServices: string[]
    notificationPrefs: {
      new_card_email: boolean
      order_status_email: boolean
      cold_customer_weekly: boolean
    }
  } | null>(null)

  // Google Scope状態
  const [googleScopes, setGoogleScopes] = useState<{
    hasGoogleAuth: boolean
    contacts: boolean
    calendar: boolean
    gmail: boolean
    drive: boolean
    email: string | null
    tokenExpired?: boolean
  } | null>(null)

  // ログイン履歴
  const [loginEvents, setLoginEvents] = useState<Array<{
    id: number
    occurred_at: string
    ip_address: string | null
    user_agent: string | null
    method: string | null
  }>>([])

  // プロフィール編集フォーム
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    name_kana: '',
    phone: '',
    mobile: '',
    department: '',
    position: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // 社員一覧
  const [employees, setEmployees] = useState<Array<{
    id: string
    email: string
    display_name: string | null
    name_kana: string | null
    department: string | null
    position: string | null
    phone: string | null
    mobile: string | null
    role: string
    status: string
    invited_at: string
    activated_at: string | null
    staff_id: string | null
  }>>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    display_name: '',
    name_kana: '',
    department: '',
    position: '',
    role: 'member',
    phone: '',
    mobile: '',
    staff_id: '',
  })
  const [isInviting, setIsInviting] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const data = await res.json()
          setCurrentUser(data)
          // プロフィールフォームに初期値設定
          setProfileForm({
            display_name: data.name || '',
            name_kana: data.nameKana || '',
            phone: data.phone || '',
            mobile: data.mobile || '',
            department: data.department || '',
            position: data.position || '',
          })
        }
      } catch {
        // ログインしていない場合は無視
      }
    }
    
    const fetchGoogleScopes = async () => {
      try {
        const res = await fetch('/api/google/scopes')
        if (res.ok) {
          const data = await res.json()
          setGoogleScopes(data)
        }
      } catch {
        // エラー時は無視
      }
    }

    const fetchLoginEvents = async () => {
      try {
        const res = await fetch('/api/me/login-events')
        if (res.ok) {
          const data = await res.json()
          setLoginEvents(data.events || [])
        }
      } catch {
        // エラー時は無視
      }
    }

    fetchUser()
    fetchGoogleScopes()
    fetchLoginEvents()
  }, [])

  // 社員一覧取得
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.data || [])
      }
    } catch {
      // エラー時は無視
    } finally {
      setEmployeesLoading(false)
    }
  }, [])

  // 社員管理ビュー表示時に取得
  useEffect(() => {
    if (currentView === 'employees') {
      fetchEmployees()
    }
  }, [currentView, fetchEmployees])

  // 社員招待
  const handleInviteEmployee = async () => {
    if (!inviteForm.email) return
    setIsInviting(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const result = await res.json()
      if (result.success) {
        setIsInviteDialogOpen(false)
        setInviteForm({
          email: '', display_name: '', name_kana: '', department: '',
          position: '', role: 'member', phone: '', mobile: '', staff_id: '',
        })
        fetchEmployees()
      } else {
        alert(result.error || '招待に失敗しました')
      }
    } catch {
      alert('招待に失敗しました')
    } finally {
      setIsInviting(false)
    }
  }

  // 社員ステータス変更
  const handleUpdateEmployeeStatus = async (employeeId: string, status: string) => {
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      fetchEmployees()
    } else {
      const result = await res.json()
      alert(result.error || '更新に失敗しました')
    }
  }

  // 社員削除
  const handleDeleteEmployee = async (employeeId: string, name: string) => {
    if (!confirm(`${name || 'この社員'}を削除しますか？この操作は取り消せません。`)) return
    const res = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchEmployees()
    } else {
      const result = await res.json()
      alert(result.error || '削除に失敗しました')
    }
  }

  // ネットワークデータは NetworkGraph 内で /api/analytics/network から取得

  // Supabaseから名刺データを取得（ページネーション対������）
  const fetchCards = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append) setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/business-cards?limit=${pageSize}&offset=${pageNum * pageSize}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'データ取得に失敗しました')
      }
      
      const loadedCards: BusinessCard[] = result.data.map((row: {
        id: string
        full_name: string | null
        full_name_kana: string | null
        company_name: string | null
        department: string | null
        position: string | null
        email: string | null
        phone: string | null
        mobile: string | null
        address: string | null
        website: string | null
        linkedin: string | null
        twitter: string | null
        notes: string | null
        tags: string[] | null
        is_favorite: boolean | null
        created_at: string
        last_contacted_at: string | null
        image_url: string | null
      }) => ({
        id: row.id,
        name: row.full_name || "不明",
        nameKana: row.full_name_kana || "",
        company: row.company_name || "",
        department: row.department || "",
        position: row.position || "",
        email: row.email || "",
        phone: row.phone || "",
        mobile: row.mobile || "",
        address: row.address || "",
        website: row.website || "",
        linkedin: row.linkedin || "",
        twitter: row.twitter || "",
        notes: row.notes || "",
        tags: row.tags || [],
        isFavorite: row.is_favorite || false,
        createdAt: new Date(row.created_at),
        lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at) : undefined,
        imageUrl: row.image_url || "",
        syncedToGoogle: false,
      }))
      
      if (append) {
        setCards(prev => [...prev, ...loadedCards])
      } else {
        setCards(loadedCards)
      }
      setTotalCount(result.count || 0)
      setHasMore(loadedCards.length === pageSize)
    } catch (error) {
      console.error('データ取得エラー:', error)
      setLoadError(error instanceof Error ? error.message : 'データ取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初回ロード
  useEffect(() => {
    fetchCards(0, false)
  }, [fetchCards])

  // もっと読み込む
  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchCards(nextPage, true)
  }, [page, fetchCards])

  // 画像をBase64に変換
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // OCR を実行して結果を返すだけ。保存はしない（confirm modal で確認後に saveOcrResult が呼ぶ）
  const runOcrOnly = useCallback(async (imageBase64: string) => {
    setIsScanning(true)
    setScanProgress(10)
    setScanStatus("OCR解析中...")
    setScanError(null)
    try {
      setScanProgress(40)
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })
      const ocrResult = await ocrResponse.json()
      if (!ocrResponse.ok) {
        const msg = ocrResult?.error || 'OCR処理に失敗しました'
        throw new Error(msg)
      }
      setScanProgress(100)
      setIsScanning(false)
      setScanStatus("")
      return ocrResult
    } catch (e) {
      setIsScanning(false)
      setScanStatus("")
      setScanProgress(0)
      throw e
    }
  }, [])

  // 単一画像/カメラスキャン: OCR 完了後、確認モーダルを表示してユーザーに保存可否を判断させる
  const processSingleScanWithConfirm = useCallback(async (imageBase64: string) => {
    try {
      const ocrResult = await runOcrOnly(imageBase64)
      const { _meta, ...rest } = ocrResult || {}
      setPendingScan({
        ocrResult: rest,
        imageBase64,
        parser: _meta?.parser,
        geminiError: _meta?.geminiError,
      })
      // 編集フォームを初期値で埋める
      setPendingEdit({
        full_name: rest.full_name || '',
        full_name_kana: rest.full_name_kana || '',
        company_name: rest.company_name || '',
        company_name_kana: rest.company_name_kana || '',
        department: rest.department || '',
        position: rest.position || '',
        email: rest.email || '',
        phone: rest.phone || '',
        mobile: rest.mobile || '',
        fax: rest.fax || '',
        postal_code: rest.postal_code || '',
        address: rest.address || '',
        website: rest.website || '',
      })
      setIsScanDialogOpen(false)
    } catch (error) {
      console.error('OCR エラー:', error)
      setScanError(error instanceof Error ? error.message : 'OCR に失敗しました')
    }
  }, [runOcrOnly])

  // PDF 用の一括処理（旧 processBusinessCard 相当）— 各ページを OCR → 即保存
  const processBusinessCard = useCallback(async (imageBase64: string) => {
    setIsScanning(true)
    setScanProgress(10)
    setScanStatus("OCR解析中...")
    setScanError(null)

    try {
      setScanProgress(30)
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })

      const ocrResult = await ocrResponse.json()

      if (!ocrResponse.ok) {
        const msg = ocrResult?.error || 'OCR処理に失敗しました'
        throw new Error(msg)
      }
      setScanProgress(60)
      setScanStatus("データ保存中...")

      // DB保存 API呼び出し
      const saveResponse = await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrResult, imageUrl: imageBase64 }),
      })

      const saveResult = await saveResponse.json()
      setScanProgress(90)

      if (!saveResult.success) {
        throw new Error(saveResult.error || '保存に失敗しました')
      }

      // UIに反映
      const newCard: BusinessCard = {
        id: saveResult.data.id,
        name: saveResult.data.full_name || "不明",
        nameKana: saveResult.data.full_name_kana || "",
        company: saveResult.data.company_name || "",
        department: saveResult.data.department || "",
        position: saveResult.data.position || "",
        email: saveResult.data.email || "",
        phone: saveResult.data.phone || "",
        mobile: saveResult.data.mobile || "",
        address: saveResult.data.address || "",
        website: saveResult.data.website || "",
        linkedin: saveResult.data.linkedin || "",
        twitter: saveResult.data.twitter || "",
        notes: saveResult.data.notes || "",
        tags: saveResult.data.tags || [],
        isFavorite: saveResult.data.is_favorite || false,
        createdAt: new Date(saveResult.data.created_at),
        imageUrl: saveResult.data.image_url || "",
        syncedToGoogle: false,
      }

      setCards(prev => [newCard, ...prev])
      setScanProgress(100)
      setScanStatus("完了!")

      // 単一読み込み（カメラ/画像）時は詳細パネルを自動で開いて確認できるようにする
      setSelectedCard(newCard)

      setTimeout(() => {
        setIsScanDialogOpen(false)
        setIsScanning(false)
        setScanProgress(0)
        setScanStatus("")
      }, 1000)

    } catch (error) {
      console.error('処理エラー:', error)
      setScanError(error instanceof Error ? error.message : '処理に失敗しました')
      setIsScanning(false)
    }
  }, [])

  // ファイル選択ハンドラ（画像 / PDF 両対応）
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 入力値をクリア（同じファイル再選択を許可）
    e.target.value = ''

    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf) {
        setIsScanning(true)
        setScanError(null)
        setScanProgress(2)
        setScanStatus('PDFを読み込み中...')

        const { pdfFileToPageImages } = await import('@/lib/pdf-split')
        const pages = await pdfFileToPageImages(file, {
          scale: 2,
          quality: 0.9,
          onProgress: (cur, total) => {
            setScanStatus(`PDFを画像化中 (${cur}/${total})`)
            setScanProgress(2 + Math.floor((cur / total) * 18))
          },
        })

        if (pages.length === 0) {
          throw new Error('PDFにページが見つかりませんでした')
        }

        let success = 0
        let failed = 0
        let completed = 0
        const CONCURRENCY = 3
        const queue = [...pages]

        const runWorker = async () => {
          while (queue.length > 0) {
            const p = queue.shift()
            if (!p) break
            try {
              await processBusinessCard(p.base64)
              success++
            } catch (err) {
              console.error(`page ${p.pageNumber} 失敗:`, err)
              failed++
            } finally {
              completed++
              setScanStatus(`AI読取り中 ${completed}/${pages.length}（成功 ${success} / 失敗 ${failed}）`)
              setScanProgress(20 + Math.floor((completed / pages.length) * 75))
            }
          }
        }

        const workers = Array.from({ length: Math.min(CONCURRENCY, pages.length) }, () => runWorker())
        await Promise.all(workers)
        setScanStatus(`完了：成功 ${success} / 失敗 ${failed}`)
        setScanProgress(100)
        setTimeout(() => {
          setIsScanning(false)
          setScanProgress(0)
          setScanStatus('')
        }, 1200)
        if (failed > 0 && success === 0) {
          setScanError(`${failed}ページの解析に失敗しました`)
        }
        return
      }

      const base64 = await imageToBase64(file)
      await processSingleScanWithConfirm(base64)
    } catch (error) {
      console.error('ファイル読み込みエラー:', error)
      setScanError(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました')
      setIsScanning(false)
    }
  }, [processBusinessCard, processSingleScanWithConfirm])

  // カメラ起動
  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      fileInputRef.current.capture = "environment"
      fileInputRef.current.click()
    }
  }, [])

  // ファイル選択起動（画像 / PDF）
  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.accept = "image/*,application/pdf,.pdf"
      fileInputRef.current.click()
    }
  }, [])

  // 全タグを取得
  const allTags = Array.from(new Set(cards.flatMap((card) => card.tags)))

  // フィルタリング
  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.nameKana.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => card.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  // お気に入り切り替え（DB更新）
  const toggleFavorite = async (id: string) => {
    const card = cards.find(c => c.id === id)
    if (!card) return
    
    const newFavorite = !card.isFavorite
    // 楽観的更新
    setCards(cards.map((c) => (c.id === id ? { ...c, isFavorite: newFavorite } : c)))
    
    try {
      const response = await fetch(`/api/business-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFavorite }),
      })
      if (!response.ok) {
        // 失敗時はロールバック
        setCards(cards.map((c) => (c.id === id ? { ...c, isFavorite: card.isFavorite } : c)))
      }
    } catch {
      // 失敗時はロールバック
      setCards(cards.map((c) => (c.id === id ? { ...c, isFavorite: card.isFavorite } : c)))
    }
  }

  // 名刺削除
  const deleteCard = async (id: string) => {
    if (!confirm('この名刺を削除しますか？')) return
    
    const prevCards = [...cards]
    setCards(cards.filter(c => c.id !== id))
    setSelectedCard(null)
    
    try {
      const response = await fetch(`/api/business-cards/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        setCards(prevCards)
        alert('削除に失敗しました')
      }
    } catch {
      setCards(prevCards)
      alert('削除に失敗しました')
    }
  }

  // 手動で名刺追加
  const handleAddCard = async () => {
    try {
      const response = await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualEntry: newCardForm }),
      })
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '追加に失敗しました')
      }
      
      const newCard: BusinessCard = {
        id: result.data.id,
        name: result.data.full_name || "不明",
        nameKana: result.data.full_name_kana || "",
        company: result.data.company_name || "",
        department: result.data.department || "",
        position: result.data.position || "",
        email: result.data.email || "",
        phone: result.data.phone || "",
        mobile: result.data.mobile || "",
        address: result.data.address || "",
        website: result.data.website || "",
        linkedin: result.data.linkedin || "",
        twitter: result.data.twitter || "",
        notes: result.data.notes || "",
        tags: result.data.tags || [],
        isFavorite: false,
        createdAt: new Date(result.data.created_at),
        imageUrl: "",
        syncedToGoogle: false,
      }
      
      setCards(prev => [newCard, ...prev])
      setTotalCount(prev => prev + 1)
      setIsAddDialogOpen(false)
      setNewCardForm({
        full_name: "", full_name_kana: "", company_name: "", department: "", position: "",
        email: "", phone: "", mobile: "", address: "", website: "", notes: ""
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : '追加に失敗しました')
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* サイドバー本体（デスクトップ＋モバイルで共有するコンテンツ） */}
        {(() => {
          const sidebarContent = (
            <>
              {/* ロゴ */}
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-sidebar-foreground">名刺Plus</h1>
                    <p className="text-xs text-muted-foreground">AI名刺管理</p>
                  </div>
                </div>
              </div>

              {/* ナビゲーション */}
              <nav className="flex-1 p-3 overflow-y-auto">
                <ul className="space-y-1">
                  {sidebarNav.map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => {
                          if (item.href && item.href !== "#") {
                            window.location.href = item.href
                            return
                          }
                          setCurrentView(item.view)
                          setIsMobileNavOpen(false)
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left min-h-11 ${
                          currentView === item.view
                            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* ユーザー */}
              <div className="p-3 border-t border-sidebar-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors min-h-11">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {currentUser?.name?.slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-sidebar-foreground">{currentUser?.name || "ログインしてください"}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem>
                      <CircleUser className="w-4 h-4 mr-2" />
                      プロフィール
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCurrentView("settings"); setIsMobileNavOpen(false) }}>
                      <Settings className="w-4 h-4 mr-2" />
                      設定
                    </DropdownMenuItem>
                    {(currentUser?.role === "owner" || currentUser?.role === "admin") && (
                      <DropdownMenuItem asChild>
                        <Link href="/settings/document-ai">
                          <Settings className="w-4 h-4 mr-2" />
                          OCR エンジン設定
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={async () => {
                      await fetch('/api/logout', { method: 'POST' })
                      window.location.href = '/login'
                    }}>
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )
          return (
            <>
              {/* デスクトップ: 固定サイドバー */}
              <aside className="hidden md:flex w-64 border-r border-border bg-sidebar flex-col">
                {sidebarContent}
              </aside>
              {/* モバイル: Drawer (Sheet) */}
              <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetContent side="left" className="p-0 w-72 bg-sidebar flex flex-col [&>button]:hidden">
                  <SheetHeader className="sr-only">
                    <SheetTitle>メニュー</SheetTitle>
                  </SheetHeader>
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            </>
          )
        })()}

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              {/* モバイル: ハンバーガー */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11 shrink-0"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="メニューを開く"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg md:text-xl font-semibold truncate">
                {currentView === "cards" && "会社の名刺帳"}
                {currentView === "cards_mine" && "マイ名刺帳"}
                {currentView === "analytics" && "分析"}
                {currentView === "dashboard" && "ダッシュボード"}
                {currentView === "employees" && "社員管理"}
                {currentView === "settings" && "設定"}
              </h2>
              {currentView === "cards" && (
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  {filteredCards.length} / {totalCount.toLocaleString()} 件
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {/* 通知 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-11 w-11">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>通知</TooltipContent>
              </Tooltip>

              {/* スキャンボタン: モバイルではアイコンのみ */}
              <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 h-11 md:h-10" aria-label="名刺をスキャン">
                    <ScanLine className="w-4 h-4" />
                    <span className="hidden md:inline">名刺をスキャン</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI 名刺スキャン
                    </DialogTitle>
                    <DialogDescription>
                      名刺をカメラまたはファイルからスキャンしてください。AIが自動で情報を抽出します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* 隠しファイル入力 */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                    />
                    
                    {scanError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                        {scanError}
                      </div>
                    )}
                    
                    {isScanning ? (
                      <div className="space-y-4">
                        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                            <p className="text-sm text-muted-foreground">AI が名刺を解析中...</p>
                          </div>
                        </div>
                        <Progress value={scanProgress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground">
                          {scanStatus || `処理中... ${scanProgress}%`}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleCameraCapture}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Camera className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm font-medium">カメラで撮影</span>
                        </button>
                        <button
                          onClick={handleFileUpload}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm font-medium">ファイルを選択</span>
                        </button>
                      </div>
                    )}

                    {/* 最近スキャンした名刺 (直近 5 件) */}
                    {!isScanning && cards.length > 0 && (
                      <div className="pt-2 border-t border-border space-y-2">
                        <p className="text-xs text-muted-foreground">最近スキャンした名刺</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {cards.slice(0, 5).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCard(c)
                                setIsScanDialogOpen(false)
                              }}
                              className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors"
                            >
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                  {(c.name || "?").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.name || "不明"}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.company || "—"}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {c.createdAt instanceof Date ? c.createdAt.toLocaleDateString("ja-JP") : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* スキャン結果確認ダイアログ: OCR 後、保存前にユーザーが内容を確認・編集する */}
              <Dialog
                open={!!pendingScan}
                onOpenChange={(open) => { if (!open) { setPendingScan(null) } }}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      スキャン結果の確認
                    </DialogTitle>
                    <DialogDescription>
                      AI が抽出した内容です。間違っていれば修正してから登録できます。
                      {pendingScan?.parser === 'rule' && (
                        <span className="block mt-1 text-xs text-amber-600">
                          ※ Gemini が使えないためルールベース parser で抽出しています。精度は低めです。
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  {pendingScan && (
                    <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">氏名</label>
                          <Input value={pendingEdit.full_name || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, full_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">ふりがな</label>
                          <Input value={pendingEdit.full_name_kana || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, full_name_kana: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">会社名</label>
                        <Input value={pendingEdit.company_name || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, company_name: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">部署</label>
                          <Input value={pendingEdit.department || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, department: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">役職</label>
                          <Input value={pendingEdit.position || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, position: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">メール</label>
                          <Input value={pendingEdit.email || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, email: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">電話</label>
                          <Input value={pendingEdit.phone || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, phone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">携帯</label>
                          <Input value={pendingEdit.mobile || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, mobile: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">FAX</label>
                          <Input value={pendingEdit.fax || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, fax: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">住所</label>
                        <Input value={pendingEdit.address || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, address: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Webサイト</label>
                        <Input value={pendingEdit.website || ''} onChange={(e) => setPendingEdit(prev => ({ ...prev, website: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      disabled={savingPending}
                      onClick={() => { setPendingScan(null); setPendingEdit({}) }}
                    >
                      いいえ（登録しない）
                    </Button>
                    <Button
                      disabled={savingPending}
                      onClick={async () => {
                        if (!pendingScan) return
                        setSavingPending(true)
                        try {
                          const merged = { ...pendingScan.ocrResult, ...pendingEdit }
                          const saveResponse = await fetch('/api/business-cards', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ocrResult: merged, imageUrl: pendingScan.imageBase64 }),
                          })
                          const saveResult = await saveResponse.json()
                          if (!saveResult.success) {
                            throw new Error(saveResult.error || '保存に失敗しました')
                          }
                          const newCard: BusinessCard = {
                            id: saveResult.data.id,
                            name: saveResult.data.full_name || "不明",
                            nameKana: saveResult.data.full_name_kana || "",
                            company: saveResult.data.company_name || "",
                            department: saveResult.data.department || "",
                            position: saveResult.data.position || "",
                            email: saveResult.data.email || "",
                            phone: saveResult.data.phone || "",
                            mobile: saveResult.data.mobile || "",
                            address: saveResult.data.address || "",
                            website: saveResult.data.website || "",
                            linkedin: saveResult.data.linkedin || "",
                            twitter: saveResult.data.twitter || "",
                            notes: saveResult.data.notes || "",
                            tags: saveResult.data.tags || [],
                            isFavorite: saveResult.data.is_favorite || false,
                            createdAt: new Date(saveResult.data.created_at),
                            imageUrl: saveResult.data.image_url || "",
                            syncedToGoogle: false,
                          }
                          setCards(prev => [newCard, ...prev])
                          setTotalCount(prev => prev + 1)
                          setSelectedCard(newCard)
                          setPendingScan(null)
                          setPendingEdit({})
                        } catch (err) {
                          alert(err instanceof Error ? err.message : '保存に失敗しました')
                        } finally {
                          setSavingPending(false)
                        }
                      }}
                    >
                      {savingPending ? '保存中...' : 'はい（登録する）'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 手動追加ダイアログ */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>名刺を手動追加</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">氏名 *</label>
                        <Input
                          value={newCardForm.full_name}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="山田 太郎"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">フリガナ</label>
                        <Input
                          value={newCardForm.full_name_kana}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, full_name_kana: e.target.value }))}
                          placeholder="ヤマダ タロウ"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">会社名</label>
                      <Input
                        value={newCardForm.company_name}
                        onChange={(e) => setNewCardForm(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="株式会社〇〇"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">部署</label>
                        <Input
                          value={newCardForm.department}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="営業部"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">役職</label>
                        <Input
                          value={newCardForm.position}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="部長"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">メールアドレス</label>
                      <Input
                        type="email"
                        value={newCardForm.email}
                        onChange={(e) => setNewCardForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="example@company.co.jp"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">電話番号</label>
                        <Input
                          value={newCardForm.phone}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="03-1234-5678"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">携帯電話</label>
                        <Input
                          value={newCardForm.mobile}
                          onChange={(e) => setNewCardForm(prev => ({ ...prev, mobile: e.target.value }))}
                          placeholder="090-1234-5678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">住所</label>
                      <Input
                        value={newCardForm.address}
                        onChange={(e) => setNewCardForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="東京都渋谷区..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Webサイト</label>
                      <Input
                        value={newCardForm.website}
                        onChange={(e) => setNewCardForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">メモ</label>
                      <textarea
                        className="w-full p-2 border rounded-md bg-background text-sm min-h-[80px]"
                        value={newCardForm.notes}
                        onChange={(e) => setNewCardForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="備考..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleAddCard} disabled={!newCardForm.full_name.trim()}>追加</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* ダッシュボードビュー */}
          {currentView === "dashboard" && (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">総名刺数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{cards.length.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">登録済み名刺</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">お気に入り</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{cards.filter(c => c.isFavorite).length.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">重要コンタクト</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">会社数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{new Set(cards.map(c => c.company).filter(Boolean)).size.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">ユニーク企業</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">今月追加</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {cards.filter(c => {
                        const now = new Date()
                        return c.createdAt.getMonth() === now.getMonth() && c.createdAt.getFullYear() === now.getFullYear()
                      }).length.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">新規登録</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>最近追加した名刺</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cards.slice(0, 10).map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{card.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{card.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{card.company}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{card.createdAt.toLocaleDateString('ja-JP')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* タグ管理ビュー */}
          {/* 分析ビュー（4タブ構成） */}
          {currentView === "analytics" && (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <Tabs value={analyticsTab} onValueChange={setAnalyticsTab} className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto">
                  <TabsTrigger value="overview">概要</TabsTrigger>
                  <TabsTrigger value="network">人脈ネットワーク</TabsTrigger>
                  <TabsTrigger value="contacts">顧客連絡頻度</TabsTrigger>
                  <TabsTrigger value="cold">営業薄企業</TabsTrigger>
                </TabsList>

                {/* タブ1: 概要 */}
                <TabsContent value="overview" className="mt-6">
                  <OverviewView />
                </TabsContent>

                {/* タブ2: 人脈ネットワーク（実DBデータをAPIから取得） */}
                <TabsContent value="network" className="mt-6">
                  <div className="h-[calc(100vh-220px)] min-h-[500px]">
                    <NetworkGraph
                      onNodeClick={(nodeId, nodeType) => {
                        if (nodeType !== "business_card") return
                        const cardId = nodeId.replace(/^card_/, "")
                        const card = cards.find((c) => c.id === cardId)
                        if (card) setSelectedCard(card)
                      }}
                    />
                  </div>
                </TabsContent>

                {/* タブ3: 顧客連絡頻度 */}
                <TabsContent value="contacts" className="mt-6">
                  <ContactsView />
                </TabsContent>

                {/* タブ4: 営業薄企業 */}
                <TabsContent value="cold" className="mt-6">
                  <ColdView onCardClick={(id) => {
                    const card = cards.find((c) => c.id === id)
                    if (card) setSelectedCard(card)
                  }} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* 社員管理ビュー */}
          {currentView === "employees" && (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="max-w-5xl space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">社員管理</h2>
                    <p className="text-muted-foreground">社員の招待・管理ができます</p>
                  </div>
                  {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      社員を招待
                    </Button>
                  )}
                </div>

                {/* 統計 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{employees.length}</div>
                      <p className="text-xs text-muted-foreground">総社員数</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</div>
                      <p className="text-xs text-muted-foreground">アクティブ</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{employees.filter(e => e.status === 'invited').length}</div>
                      <p className="text-xs text-muted-foreground">招待中</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{employees.filter(e => e.status === 'suspended').length}</div>
                      <p className="text-xs text-muted-foreground">停止中</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 社員リスト */}
                <Card>
                  <CardHeader>
                    <CardTitle>社員一覧</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {employeesLoading ? (
                      <p className="text-muted-foreground text-center py-8">読み込み中...</p>
                    ) : (
                      <>
                        {/* デスクトップ: テーブル */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-2">氏名</th>
                                <th className="text-left py-3 px-2">メール</th>
                                <th className="text-left py-3 px-2">部署</th>
                                <th className="text-left py-3 px-2">役職</th>
                                <th className="text-left py-3 px-2">権限</th>
                                <th className="text-left py-3 px-2">ステータス</th>
                                <th className="text-left py-3 px-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employees.map((emp) => (
                                <tr key={emp.id} className="border-b hover:bg-muted/50">
                                  <td className="py-3 px-2">
                                    <div>
                                      <p className="font-medium">{emp.display_name || '未設定'}</p>
                                      {emp.name_kana && (
                                        <p className="text-xs text-muted-foreground">{emp.name_kana}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-muted-foreground">{emp.email}</td>
                                  <td className="py-3 px-2">{emp.department || '-'}</td>
                                  <td className="py-3 px-2">{emp.position || '-'}</td>
                                  <td className="py-3 px-2">
                                    <Badge variant={emp.role === 'owner' ? 'default' : emp.role === 'admin' ? 'secondary' : 'outline'}>
                                      {emp.role === 'owner' ? 'オーナー' : emp.role === 'admin' ? '管理者' : 'メンバー'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-2">
                                    <Badge variant={emp.status === 'active' ? 'default' : emp.status === 'invited' ? 'secondary' : 'destructive'}>
                                      {emp.status === 'active' ? 'アクティブ' : emp.status === 'invited' ? '招待中' : '停止中'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-2">
                                    {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && emp.role !== 'owner' && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {emp.status === 'active' && (
                                            <DropdownMenuItem onClick={() => handleUpdateEmployeeStatus(emp.id, 'suspended')}>
                                              アカウント停止
                                            </DropdownMenuItem>
                                          )}
                                          {emp.status === 'suspended' && (
                                            <DropdownMenuItem onClick={() => handleUpdateEmployeeStatus(emp.id, 'active')}>
                                              アカウント復活
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDeleteEmployee(emp.id, emp.display_name || '')}
                                          >
                                            削除
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* モバイル: カードリスト */}
                        <div className="md:hidden space-y-3">
                          {employees.map((emp) => (
                            <div key={emp.id} className="border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{emp.display_name || '未設定'}</p>
                                  {emp.name_kana && (
                                    <p className="text-xs text-muted-foreground truncate">{emp.name_kana}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                </div>
                                {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && emp.role !== 'owner' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {emp.status === 'active' && (
                                        <DropdownMenuItem onClick={() => handleUpdateEmployeeStatus(emp.id, 'suspended')}>
                                          アカウント停止
                                        </DropdownMenuItem>
                                      )}
                                      {emp.status === 'suspended' && (
                                        <DropdownMenuItem onClick={() => handleUpdateEmployeeStatus(emp.id, 'active')}>
                                          アカウント復活
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleDeleteEmployee(emp.id, emp.display_name || '')}
                                      >
                                        削除
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 text-xs">
                                <Badge variant={emp.role === 'owner' ? 'default' : emp.role === 'admin' ? 'secondary' : 'outline'}>
                                  {emp.role === 'owner' ? 'オーナー' : emp.role === 'admin' ? '管理者' : 'メンバー'}
                                </Badge>
                                <Badge variant={emp.status === 'active' ? 'default' : emp.status === 'invited' ? 'secondary' : 'destructive'}>
                                  {emp.status === 'active' ? 'アクティブ' : emp.status === 'invited' ? '招待中' : '停止中'}
                                </Badge>
                                {emp.department && <Badge variant="outline">{emp.department}</Badge>}
                                {emp.position && <Badge variant="outline">{emp.position}</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* 招待ダイアログ */}
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>社員を招待</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div>
                        <label className="text-sm font-medium">メールアドレス *</label>
                        <Input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="example@company.co.jp"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">氏名</label>
                          <Input
                            value={inviteForm.display_name}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, display_name: e.target.value }))}
                            placeholder="山田 太郎"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">フリガナ</label>
                          <Input
                            value={inviteForm.name_kana}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, name_kana: e.target.value }))}
                            placeholder="ヤマダ タロウ"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">部署</label>
                          <Input
                            value={inviteForm.department}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                            placeholder="営業部"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">役職</label>
                          <Input
                            value={inviteForm.position}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, position: e.target.value }))}
                            placeholder="部長"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">電話番号</label>
                          <Input
                            value={inviteForm.phone}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="03-1234-5678"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">携帯電話</label>
                          <Input
                            value={inviteForm.mobile}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, mobile: e.target.value }))}
                            placeholder="090-1234-5678"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">社員番号</label>
                          <Input
                            value={inviteForm.staff_id}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, staff_id: e.target.value }))}
                            placeholder="EMP001"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">権限</label>
                          <select
                            className="w-full p-2 border rounded-md bg-background"
                            value={inviteForm.role}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                          >
                            <option value="member">メンバー</option>
                            <option value="admin">管理者</option>
                            {currentUser?.role === 'owner' && <option value="owner">オーナー</option>}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>キャンセル</Button>
                      <Button onClick={handleInviteEmployee} disabled={!inviteForm.email || isInviting}>
                        {isInviting ? '招待中...' : '招待する'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {/* 設定ビュー */}
          {currentView === "settings" && (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="max-w-3xl space-y-6">
                {/* Google Workspace 連携 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Google Workspace 連携</CardTitle>
                    <CardDescription>
                      Google アカウントでログインすると、各サービスとの連携が可能になります。
                      連携には個別の権限承認が必要です。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 全体未接続バナー (目立つ CTA) */}
                    {!googleScopes?.hasGoogleAuth && (
                      <div className="p-5 rounded-xl bg-gradient-to-r from-blue-600/15 to-blue-500/10 border-2 border-blue-500/40 shadow-sm">
                        <div className="flex items-start gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px] space-y-1">
                            <p className="font-semibold text-base flex items-center gap-2">
                              <span className="inline-flex w-7 h-7 rounded-full bg-blue-500 items-center justify-center text-white text-xs">!</span>
                              Google アカウントを連携してください
                            </p>
                            <p className="text-sm text-muted-foreground">
                              現在は Magic Link (メールリンク) ログインのため、Google サービス連携が無効です。下のボタンから Google でログインし直すと、Gmail / Calendar の分析が使えるようになります。
                            </p>
                          </div>
                          <Button
                            size="lg"
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                            onClick={async () => {
                              const { createClient } = await import('@/lib/supabase/client')
                              const supabase = createClient()
                              await supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                  scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                                  queryParams: {
                                    include_granted_scopes: 'true',
                                    access_type: 'offline',
                                    prompt: 'consent',
                                  },
                                  redirectTo: `${window.location.origin}/auth/callback?next=/`,
                                },
                              })
                            }}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google アカウントで連携
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 全体接続状況 (接続済みの時のみ表示) */}
                    {googleScopes?.hasGoogleAuth && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Google アカウント</p>
                            <p className="text-sm text-muted-foreground">
                              {googleScopes?.email || currentUser?.email || '未接続'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">接続済み</Badge>
                            {googleScopes?.tokenExpired && (
                              <Badge variant="destructive">トークン期限切れ</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* サービス別 */}
                    <div className="space-y-3">
                      {GOOGLE_SERVICES.map((service) => {
                        const isEnabled = googleScopes?.[service.key as keyof typeof googleScopes] === true
                        const isDisabledByUser = currentUser?.disabledGoogleServices?.includes(service.key)
                        return (
                          <div key={service.key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <service.icon className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isDisabledByUser ? (
                                <Badge variant="outline">無効化済み</Badge>
                              ) : isEnabled ? (
                                <Badge variant="default">承認済み</Badge>
                              ) : (
                                <Badge variant="secondary">未承認</Badge>
                              )}
                              {!isEnabled && !isDisabledByUser && (
                                <Button
                                  size="default"
                                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                                  onClick={async () => {
                                    const { createClient } = await import('@/lib/supabase/client')
                                    const supabase = createClient()
                                    await supabase.auth.signInWithOAuth({
                                      provider: 'google',
                                      options: {
                                        scopes: service.scope,
                                        queryParams: {
                                          include_granted_scopes: 'true',
                                          access_type: 'offline',
                                          prompt: 'consent',
                                        },
                                        redirectTo: `${window.location.origin}/auth/callback?next=/`,
                                      },
                                    })
                                  }}
                                >
                                  Google で連携 →
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Google Meet は Calendar 経由で自動的に利用可能です
                    </p>
                  </CardContent>
                </Card>

                {/* データ整備 (管理者のみ) */}
                {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                  <IndustryClassifyCard />
                )}

                {/* プロフィール */}
                <Card>
                  <CardHeader>
                    <CardTitle>プロフィール</CardTitle>
                    <CardDescription>あなたの基本情報を編集できます</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">氏名</label>
                        <Input
                          value={profileForm.display_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                          placeholder="山田 太郎"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">フリガナ</label>
                        <Input
                          value={profileForm.name_kana}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name_kana: e.target.value }))}
                          placeholder="ヤマダ タロウ"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">メールアドレス</label>
                      <Input value={currentUser?.email || ''} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">メールアドレスは変更できません</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">部署</label>
                        <Input
                          value={profileForm.department}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="営業部"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">役職</label>
                        <Input
                          value={profileForm.position}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="部長"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">電話番号</label>
                        <Input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="03-1234-5678"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">携帯電話</label>
                        <Input
                          value={profileForm.mobile}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, mobile: e.target.value }))}
                          placeholder="090-1234-5678"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsSavingProfile(true)
                        try {
                          const res = await fetch('/api/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(profileForm),
                          })
                          if (res.ok) {
                            alert('保存しました')
                            // ユーザー情報を再取得
                            const userRes = await fetch('/api/me')
                            if (userRes.ok) {
                              const data = await userRes.json()
                              setCurrentUser(data)
                            }
                          } else {
                            alert('保存に失敗しました')
                          }
                        } finally {
                          setIsSavingProfile(false)
                        }
                      }}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? '保存中...' : '保存'}
                    </Button>
                  </CardContent>
                </Card>

                {/* セキュリティ */}
                <Card>
                  <CardHeader>
                    <CardTitle>セキュリティ</CardTitle>
                    <CardDescription>ログイン情報とセッション管理</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">ログイン方法</p>
                      <p className="text-sm text-muted-foreground">Google OAuth</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">最近のログイン履歴</p>
                      {loginEvents.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {loginEvents.slice(0, 5).map((event) => (
                            <div key={event.id} className="text-sm p-2 bg-muted/50 rounded">
                              <p>{new Date(event.occurred_at).toLocaleString('ja-JP')}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.ip_address || '不明'} / {event.method || 'unknown'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">履歴がありません</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm('全てのデバイスからログアウトしますか？')) return
                        const res = await fetch('/api/me/sign-out-all', { method: 'POST' })
                        if (res.ok) {
                          window.location.href = '/login'
                        }
                      }}
                    >
                      全デバイスからログアウト
                    </Button>
                  </CardContent>
                </Card>

                {/* 通知設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle>通知設定</CardTitle>
                    <CardDescription>メール通知の設定</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">新しい名刺が登録された時</p>
                        <p className="text-sm text-muted-foreground">チームメンバーが名刺を登録した時に通知</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentUser?.notificationPrefs?.new_card_email || false}
                        onChange={async (e) => {
                          const newPrefs = {
                            ...currentUser?.notificationPrefs,
                            new_card_email: e.target.checked,
                          }
                          await fetch('/api/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notification_prefs: newPrefs }),
                          })
                          if (currentUser) {
                            setCurrentUser({ ...currentUser, notificationPrefs: newPrefs as typeof currentUser.notificationPrefs })
                          }
                        }}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">発注ステータスが変わった時</p>
                        <p className="text-sm text-muted-foreground">印刷発注の進捗通知</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentUser?.notificationPrefs?.order_status_email || false}
                        onChange={async (e) => {
                          const newPrefs = {
                            ...currentUser?.notificationPrefs,
                            order_status_email: e.target.checked,
                          }
                          await fetch('/api/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notification_prefs: newPrefs }),
                          })
                          if (currentUser) {
                            setCurrentUser({ ...currentUser, notificationPrefs: newPrefs as typeof currentUser.notificationPrefs })
                          }
                        }}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">営業薄企業アラート（週次）</p>
                        <p className="text-sm text-muted-foreground">連絡頻度が低い顧客の週次サマリ</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentUser?.notificationPrefs?.cold_customer_weekly || false}
                        onChange={async (e) => {
                          const newPrefs = {
                            ...currentUser?.notificationPrefs,
                            cold_customer_weekly: e.target.checked,
                          }
                          await fetch('/api/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notification_prefs: newPrefs }),
                          })
                          if (currentUser) {
                            setCurrentUser({ ...currentUser, notificationPrefs: newPrefs as typeof currentUser.notificationPrefs })
                          }
                        }}
                        className="w-5 h-5"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 危険ゾーン */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">危険ゾーン</CardTitle>
                    <CardDescription>これらの操作は元に戻せません</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">アカウントを退会</p>
                        <p className="text-sm text-muted-foreground">
                          退会後はログインできなくなります。データは保持されます。
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm('本当に退会しますか？この操作は取り消せません。')) return
                          if (!confirm('最終確認：退会するとログインできなくなります。よろしいですか？')) return
                          const res = await fetch('/api/me/delete', { method: 'POST' })
                          if (res.ok) {
                            window.location.href = '/login?message=account_suspended'
                          } else {
                            alert('退会処理に失敗しました')
                          }
                        }}
                      >
                        退会する
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* スキャンビュー */}
          {/* 名刺一覧ビュー */}
          {currentView === "cards_mine" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-6xl mx-auto space-y-5">
                {/* 業務モデル明記バナー */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                  <span className="font-medium text-emerald-700">名刺Plus はサブスク型 — ¥1,950 / 月 + 名刺 50 枚発注で全機能利用可</span>
                  <span className="text-muted-foreground"> 名刺の継続発注が利用条件です。発注が途絶えると分析機能を含むサービスが停止します。</span>
                </div>
                <SubscriptionCard />
                <TrustSection />
                <Tabs defaultValue="my-card" className="w-full">
                  <TabsList className="grid grid-cols-3 max-w-md">
                    <TabsTrigger value="my-card">自分の名刺</TabsTrigger>
                    <TabsTrigger value="collected">集めた名刺</TabsTrigger>
                    <TabsTrigger value="orders">発注履歴</TabsTrigger>
                  </TabsList>
                  <TabsContent value="my-card" className="mt-5">
                    <MyCardDesigner />
                  </TabsContent>
                  <TabsContent value="collected" className="mt-5">
                    <p className="text-sm text-muted-foreground mb-3">
                      自分でスキャン / 手動追加した名刺の一覧です。CSV 一括インポートしたものは「会社の名刺帳」に出ます。
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {cards.length === 0 ? (
                        <p className="text-muted-foreground col-span-full py-12 text-center">まだ名刺がありません。右上の「名刺をスキャン」から登録してください。</p>
                      ) : cards.map(c => (
                        <Card key={c.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedCard(c)}>
                          <CardContent className="pt-4 space-y-1">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-sm text-muted-foreground">{c.company}</div>
                            {c.email && <div className="text-xs text-muted-foreground truncate">{c.email}</div>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="orders" className="mt-5">
                    <MyCardOrdersList />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {currentView === "cards" && (
            <>
              {/* ツールバー */}
              <div className="px-6 py-4 border-b border-border bg-card/50 flex items-center gap-4">
                {/* 検索 */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="名前、会社名、メールで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                {/* タグフィルター */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="w-4 h-4" />
                      フィルター
                      {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">タグで絞り込み</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              setSelectedTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              )
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedTags.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSelectedTags([])}>
                          フィルターをクリア
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 表示切り替え */}
                <div className="flex items-center border border-border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {/* 追加ボタン */}
                <Button variant="outline" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  手動追加
                </Button>
              </div>

              {/* コンテンツエリア */}
              <div className="flex-1 flex overflow-hidden">
                {/* カード一覧 */}
                <ScrollArea className="flex-1 p-6">
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                      {filteredCards.map((card) => (
                        <Card
                          key={card.id}
                          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                            selectedCard?.id === card.id ? "border-primary ring-1 ring-primary" : ""
                          }`}
                          onClick={() => setSelectedCard(card)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={card.imageUrl} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                    {card.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold text-card-foreground">{card.name}</h3>
                                  <p className="text-xs text-muted-foreground">{card.nameKana}</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(card.id)
                                }}
                                className="text-muted-foreground hover:text-warning transition-colors"
                              >
                                {card.isFavorite ? (
                                  <Star className="w-4 h-4 fill-warning text-warning" />
                                ) : (
                                  <StarOff className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate text-card-foreground">{card.company}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="ml-5.5">{card.department} / {card.position}</span>
                              </div>
                            </div>
                            <Separator />
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate text-muted-foreground">{card.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{card.phone}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex flex-wrap gap-1">
                                {card.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {card.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    +{card.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                              {card.syncedToGoogle && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <CheckCircle2 className="w-4 h-4 text-accent" />
                                  </TooltipTrigger>
                                  <TooltipContent>Google連携済み</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCards.map((card) => (
                        <Card
                          key={card.id}
                          className={`cursor-pointer transition-all hover:border-primary/50 ${
                            selectedCard?.id === card.id ? "border-primary ring-1 ring-primary" : ""
                          }`}
                          onClick={() => setSelectedCard(card)}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={card.imageUrl} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {card.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-card-foreground">{card.name}</h3>
                                {card.isFavorite && <Star className="w-3.5 h-3.5 fill-warning text-warning" />}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {card.company} / {card.position}
                              </p>
                            </div>
                            <div className="hidden md:block text-sm text-muted-foreground">{card.email}</div>
                            <div className="hidden lg:flex gap-1">
                              {card.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            {card.syncedToGoogle && <CheckCircle2 className="w-4 h-4 text-accent" />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  編集
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  共有
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  エクスポート
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteCard(card.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  削除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {/* もっと読み込むボタン */}
                  {hasMore && filteredCards.length > 0 && (
                    <div className="flex justify-center py-4">
                      <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                        {isLoading ? "読み込み中..." : `さらに読み込む（残り ${Math.max(0, totalCount - cards.length).toLocaleString()} 件）`}
                      </Button>
                    </div>
                  )}
                </ScrollArea>

                {/* 詳細パネル：デスクトップは右固定 aside、モバイルは Sheet で全画面オーバーレイ */}
                {selectedCard && (() => {
                  const detailHeader = (
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">名刺詳細</h3>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>編集</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              onClick={() => deleteCard(selectedCard.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>削除</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setSelectedCard(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>閉じる</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )
                  const detailBody = (
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-6 pb-24 md:pb-6">
                        {/* プロフィール */}
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="w-20 h-20 mb-3">
                            <AvatarImage src={selectedCard.imageUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                              {selectedCard.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <h4 className="text-lg font-semibold">{selectedCard.name}</h4>
                          <p className="text-sm text-muted-foreground">{selectedCard.nameKana}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedCard.company}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedCard.department} / {selectedCard.position}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className="gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              メール
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              電話
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        {/* 連絡先情報 */}
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-muted-foreground">連絡先</h5>
                          <div className="space-y-2.5">
                            <div className="flex items-start gap-3">
                              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <a href={`mailto:${selectedCard.email}`} className="text-sm break-all hover:underline">{selectedCard.email}</a>
                                <p className="text-xs text-muted-foreground">メール</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <a href={`tel:${selectedCard.phone}`} className="text-sm hover:underline">{selectedCard.phone}</a>
                                <p className="text-xs text-muted-foreground">電話</p>
                              </div>
                            </div>
                            {selectedCard.mobile && (
                              <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <a href={`tel:${selectedCard.mobile}`} className="text-sm hover:underline">{selectedCard.mobile}</a>
                                  <p className="text-xs text-muted-foreground">携帯</p>
                                </div>
                              </div>
                            )}
                            {selectedCard.address && (
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm">{selectedCard.address}</p>
                                  <p className="text-xs text-muted-foreground">住所</p>
                                </div>
                              </div>
                            )}
                            {selectedCard.website && (
                              <div className="flex items-start gap-3">
                                <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={selectedCard.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline break-all"
                                  >
                                    {selectedCard.website}
                                  </a>
                                  <p className="text-xs text-muted-foreground">ウェブサイト</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ソーシャル */}
                        {(selectedCard.linkedin || selectedCard.twitter) && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">SNS</h5>
                              <div className="flex gap-2 flex-wrap">
                                {selectedCard.linkedin && (
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <Linkedin className="w-3.5 h-3.5" />
                                    LinkedIn
                                  </Button>
                                )}
                                {selectedCard.twitter && (
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <Twitter className="w-3.5 h-3.5" />
                                    Twitter
                                  </Button>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        <Separator />

                        {/* タグ */}
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-muted-foreground">タグ</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCard.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                              <Plus className="w-3 h-3 mr-1" />
                              追加
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        {/* 企業情報・ニュース（自動取得） */}
                        {selectedCard.company && (
                          <>
                            <CompanyInfoSection companyName={selectedCard.company} />
                            <CompanyNewsSection companyName={selectedCard.company} />
                            <Separator />
                          </>
                        )}

                        {/* メタ情報 */}
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-muted-foreground">情報</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">登録日</span>
                              <span>{selectedCard.createdAt.toLocaleDateString("ja-JP")}</span>
                            </div>
                            {selectedCard.lastContactedAt && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">最終連絡</span>
                                <span>{selectedCard.lastContactedAt.toLocaleDateString("ja-JP")}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Google 連携</span>
                              <span className="flex items-center gap-1.5">
                                {selectedCard.syncedToGoogle ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                    同期済み
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-warning" />
                                    未同期
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* アクション */}
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <Calendar className="w-4 h-4" />
                            Google カレンダーで予定を作成
                          </Button>
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <FileText className="w-4 h-4" />
                            メモを追加
                          </Button>
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <FolderSync className="w-4 h-4" />
                            Google Contacts に同期
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  )
                  // モバイル用 sticky アクションバー（メール/電話/閉じる）
                  const mobileActionBar = (
                    <div className="md:hidden sticky bottom-0 inset-x-0 bg-card border-t border-border p-3 flex gap-2">
                      <a href={`mailto:${selectedCard.email}`} className="flex-1">
                        <Button className="w-full gap-1.5 h-11" variant="default">
                          <Mail className="w-4 h-4" />
                          メール
                        </Button>
                      </a>
                      <a href={`tel:${selectedCard.phone || selectedCard.mobile || ""}`} className="flex-1">
                        <Button className="w-full gap-1.5 h-11" variant="outline">
                          <Phone className="w-4 h-4" />
                          電話
                        </Button>
                      </a>
                    </div>
                  )
                  return (
                    <>
                      {/* デスクトップ: 右側 aside */}
                      <aside className="hidden md:flex w-96 border-l border-border bg-card overflow-hidden flex-col">
                        {detailHeader}
                        {detailBody}
                      </aside>
                      {/* モバイル: 下からスライドアップ Sheet（全画面） */}
                      <Sheet open={isMobile && !!selectedCard} onOpenChange={(open) => { if (!open) setSelectedCard(null) }}>
                        <SheetContent
                          side="bottom"
                          className="md:hidden p-0 h-[92dvh] flex flex-col bg-card [&>button]:hidden"
                        >
                          <SheetHeader className="sr-only">
                            <SheetTitle>名刺詳細</SheetTitle>
                          </SheetHeader>
                          {detailHeader}
                          {detailBody}
                          {mobileActionBar}
                        </SheetContent>
                      </Sheet>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}
