"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

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

// サンプルデータ
const sampleCards: BusinessCard[] = [
  {
    id: "1",
    name: "田中 太郎",
    nameKana: "タナカ タロウ",
    company: "株式会社テクノロジー",
    department: "営業部",
    position: "部長",
    email: "tanaka@technology.co.jp",
    phone: "03-1234-5678",
    mobile: "090-1234-5678",
    address: "東京都渋谷区神宮前1-2-3",
    website: "https://technology.co.jp",
    linkedin: "tanaka-taro",
    tags: ["重要顧客", "IT", "営業"],
    isFavorite: true,
    createdAt: new Date("2024-01-15"),
    lastContactedAt: new Date("2024-03-10"),
    syncedToGoogle: true,
  },
  {
    id: "2",
    name: "佐藤 花子",
    nameKana: "サトウ ハナコ",
    company: "デザインスタジオ ABC",
    department: "クリエイティブ部",
    position: "ディレクター",
    email: "sato@abc-design.jp",
    phone: "06-9876-5432",
    tags: ["デザイン", "パートナー"],
    isFavorite: false,
    createdAt: new Date("2024-02-20"),
    syncedToGoogle: true,
  },
  {
    id: "3",
    name: "山田 一郎",
    nameKana: "ヤマダ イチロウ",
    company: "グローバルコンサルティング",
    department: "戦略企画室",
    position: "マネージャー",
    email: "yamada@global-consulting.com",
    phone: "03-5555-1234",
    mobile: "080-5555-1234",
    address: "東京都港区六本木4-5-6",
    tags: ["コンサル", "戦略"],
    isFavorite: true,
    createdAt: new Date("2024-01-05"),
    lastContactedAt: new Date("2024-03-15"),
    syncedToGoogle: false,
  },
  {
    id: "4",
    name: "鈴木 美咲",
    nameKana: "スズキ ミサキ",
    company: "フィンテック株式会社",
    department: "プロダクト開発",
    position: "プロダクトマネージャー",
    email: "suzuki@fintech.co.jp",
    phone: "03-7777-8888",
    tags: ["フィンテック", "スタートアップ"],
    isFavorite: false,
    createdAt: new Date("2024-03-01"),
    syncedToGoogle: true,
  },
  {
    id: "5",
    name: "高橋 健太",
    nameKana: "タカハシ ケンタ",
    company: "メディアネットワーク",
    department: "広報部",
    position: "広報担当",
    email: "takahashi@media-network.jp",
    phone: "03-2222-3333",
    tags: ["メディア", "広報"],
    isFavorite: false,
    createdAt: new Date("2024-02-10"),
    syncedToGoogle: true,
  },
]

// Google Workspace連携ステータス
const gwsIntegrations = [
  { name: "Google Contacts", status: "connected", icon: Users, lastSync: "5分前" },
  { name: "Google Calendar", status: "connected", icon: Calendar, lastSync: "10分前" },
  { name: "Gmail", status: "connected", icon: Mail, lastSync: "2分前" },
  { name: "Google Drive", status: "connected", icon: FolderSync, lastSync: "15分前" },
  { name: "Google Meet", status: "connected", icon: ExternalLink, lastSync: "即時" },
]

// サイドバーナビゲーション
const sidebarNav = [
  { name: "ダッシュボード", icon: Home, href: "#", active: false },
  { name: "名刺一覧", icon: Briefcase, href: "#", active: true },
  { name: "スキャン", icon: ScanLine, href: "#", active: false },
  { name: "タグ管理", icon: Tag, href: "#", active: false },
  { name: "分析", icon: BarChart3, href: "#", active: false },
  { name: "設定", icon: Settings, href: "#", active: false },
]

export default function BusinessCardApp() {
  const [cards, setCards] = useState<BusinessCard[]>(sampleCards)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

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

  // お気に入り切り替え
  const toggleFavorite = (id: string) => {
    setCards(cards.map((card) => (card.id === id ? { ...card, isFavorite: !card.isFavorite } : card)))
  }

  // スキャンシミュレーション
  const handleScan = () => {
    setIsScanning(true)
    setScanProgress(0)
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          setIsScanDialogOpen(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* サイドバー */}
        <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
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
          <nav className="flex-1 p-3">
            <ul className="space-y-1">
              {sidebarNav.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      item.active
                        ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>

            {/* GWS連携ステータス */}
            <div className="mt-6">
              <p className="px-3 text-xs font-medium text-muted-foreground mb-2">Google Workspace 連携</p>
              <ul className="space-y-1">
                {gwsIntegrations.map((integration) => (
                  <li key={integration.name}>
                    <div className="flex items-center gap-2 px-3 py-2 text-xs">
                      <integration.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="flex-1 text-muted-foreground">{integration.name}</span>
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* ユーザー */}
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">山田</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">山田 太郎</p>
                    <p className="text-xs text-muted-foreground">Pro プラン</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <CircleUser className="w-4 h-4 mr-2" />
                  プロフィール
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  設定
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">ログアウト</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">名刺一覧</h2>
              <Badge variant="secondary" className="text-xs">
                {filteredCards.length} 件
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {/* 通知 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>通知</TooltipContent>
              </Tooltip>

              {/* スキャンボタン */}
              <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <ScanLine className="w-4 h-4" />
                    名刺をスキャン
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
                          OCR処理中... {scanProgress}%
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleScan}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Camera className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm font-medium">カメラで撮影</span>
                        </button>
                        <button
                          onClick={handleScan}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm font-medium">ファイルを選択</span>
                        </button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

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
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              手動追加
            </Button>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 flex overflow-hidden">
            {/* カード一覧 */}
            <ScrollArea className="flex-1 p-6">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                            <DropdownMenuItem className="text-destructive">
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
            </ScrollArea>

            {/* 詳細パネル */}
            {selectedCard && (
              <aside className="w-96 border-l border-border bg-card overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">名刺詳細</h3>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                          className="h-8 w-8"
                          onClick={() => setSelectedCard(null)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>新しいタブで開く</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
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
                          <div>
                            <p className="text-sm">{selectedCard.email}</p>
                            <p className="text-xs text-muted-foreground">メール</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm">{selectedCard.phone}</p>
                            <p className="text-xs text-muted-foreground">電話</p>
                          </div>
                        </div>
                        {selectedCard.mobile && (
                          <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm">{selectedCard.mobile}</p>
                              <p className="text-xs text-muted-foreground">携帯</p>
                            </div>
                          </div>
                        )}
                        {selectedCard.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm">{selectedCard.address}</p>
                              <p className="text-xs text-muted-foreground">住所</p>
                            </div>
                          </div>
                        )}
                        {selectedCard.website && (
                          <div className="flex items-start gap-3">
                            <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <a
                                href={selectedCard.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
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
                          <div className="flex gap-2">
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
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                          <Plus className="w-3 h-3 mr-1" />
                          追加
                        </Button>
                      </div>
                    </div>

                    <Separator />

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
              </aside>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
