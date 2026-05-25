"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, AlertTriangle, Upload, Save, Send } from "lucide-react"

interface SettingsState {
  gcp_project_id: string | null
  gcp_location: string
  gcp_processor_id: string | null
  has_service_account: boolean
  service_account_email: string | null
  has_gemini_api_key: boolean
  updated_at: string | null
}

interface TestResult {
  ok: boolean
  stage?: string
  error?: string
  raw_text_preview?: string
  page_count?: number
  parsed?: Record<string, string | undefined | null>
}

const LOCATIONS = [
  { value: "us", label: "us（米国・推奨）" },
  { value: "asia-northeast1", label: "asia-northeast1（東京）" },
  { value: "eu", label: "eu" },
]

export default function DocumentAiSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [state, setState] = useState<SettingsState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [test, setTest] = useState<TestResult | null>(null)

  // form
  const [projectId, setProjectId] = useState("")
  const [location, setLocation] = useState("us")
  const [processorId, setProcessorId] = useState("")
  const [serviceAccountJson, setServiceAccountJson] = useState("")
  const [geminiApiKey, setGeminiApiKey] = useState("")

  const fileRef = useRef<HTMLInputElement>(null)
  const testFileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/settings/document-ai", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "読み込みに失敗しました")
      setState(data)
      setProjectId(data.gcp_project_id || "")
      setLocation(data.gcp_location || "us")
      setProcessorId(data.gcp_processor_id || "")
      setServiceAccountJson("") // 値は返さないので空欄
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setToast(null)
    try {
      const body: Record<string, string> = {
        gcp_project_id: projectId,
        gcp_location: location,
        gcp_processor_id: processorId,
      }
      if (serviceAccountJson.trim().length > 0) {
        body.gcp_service_account_json = serviceAccountJson.trim()
      }
      if (geminiApiKey.trim().length > 0) {
        body.gemini_api_key = geminiApiKey.trim()
      }
      const res = await fetch("/api/settings/document-ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "保存に失敗しました")
      setState(data)
      setServiceAccountJson("")
      setGeminiApiKey("")
      setToast("保存しました")
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleSAFile(file: File) {
    const text = await file.text()
    setServiceAccountJson(text)
  }

  async function handleTestFile(file: File) {
    setTesting(true)
    setTest(null)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const res = await fetch("/api/settings/document-ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      setTest(data)
    } catch (e) {
      setTest({ ok: false, stage: "client", error: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
      if (testFileRef.current) testFileRef.current.value = ""
    }
  }

  const isConfigured =
    !!state &&
    !!state.gcp_project_id &&
    !!state.gcp_processor_id &&
    state.has_service_account

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Document AI 設定</h1>
          <p className="text-sm text-muted-foreground mt-1">
            名刺の OCR を Google Document AI（テキスト抽出）+ Gemini API（構造化）で実行します。
            プロジェクト・プロセッサ・Service Account を 1 度登録すれば、社員全員の OCR がここを参照します。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中…
          </div>
        ) : (
          <>
            {/* ステータス */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">ステータス</CardTitle>
                  {isConfigured ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      設定済み
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      未設定
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>
                  プロジェクト: <span className="text-foreground">{state?.gcp_project_id || "未登録"}</span>
                </div>
                <div>
                  リージョン: <span className="text-foreground">{state?.gcp_location || "us"}</span>
                </div>
                <div>
                  プロセッサ ID: <span className="text-foreground font-mono text-xs">{state?.gcp_processor_id || "未登録"}</span>
                </div>
                <div>
                  Service Account:{" "}
                  <span className="text-foreground">
                    {state?.has_service_account ? state.service_account_email || "登録済み" : "未登録"}
                  </span>
                </div>
                <div>
                  Gemini API キー:{" "}
                  <span className="text-foreground">
                    {state?.has_gemini_api_key ? "登録済み ✓" : "未登録（ルールベース parser で動作）"}
                  </span>
                </div>
                {state?.updated_at && (
                  <div className="text-xs">最終更新: {new Date(state.updated_at).toLocaleString("ja-JP")}</div>
                )}
              </CardContent>
            </Card>

            {/* 編集フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">設定を編集</CardTitle>
                <CardDescription>
                  Google Cloud Console / Document AI コンソールで作成した値を貼り付けてください。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="proj">GCP プロジェクト ID</Label>
                  <Input
                    id="proj"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="aidriven-mastering-fyqu"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    GCP コンソールで「プロジェクト ID」と表示される文字列（プロジェクト番号ではなく）。
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>リージョン</Label>
                  <div className="grid gap-2">
                    {LOCATIONS.map((l) => (
                      <label key={l.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="location"
                          value={l.value}
                          checked={location === l.value}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                        {l.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proc">Document OCR プロセッサ ID</Label>
                  <Input
                    id="proc"
                    value={processorId}
                    onChange={(e) => setProcessorId(e.target.value)}
                    placeholder="57695b373b653f96"
                    autoComplete="off"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Document AI コンソールで作成した Document OCR プロセッサの ID。
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sa">Service Account JSON</Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleSAFile(f)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      JSON ファイルを選択
                    </Button>
                    {state?.has_service_account && !serviceAccountJson && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                        既存の JSON は登録済み
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    id="sa"
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                    placeholder='{ "type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..." }'
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON はサーバーで保存され、画面には二度と表示されません。Document AI の OCR 認証に使います。
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label htmlFor="gemini">Gemini API キー（推奨）</Label>
                  <Input
                    id="gemini"
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder={state?.has_gemini_api_key ? "登録済み（再入力で上書き）" : "AIzaSy..."}
                    autoComplete="off"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Document OCR が読み取った生テキストを Gemini で構造化（氏名 / 会社名 / 役職 / 住所 等）するためのキーです。
                    未設定でも動きますが、ルールベース parser になるため精度が落ちます。
                  </p>
                  <p className="text-xs text-muted-foreground">
                    取得方法: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://aistudio.google.com/app/apikey</a> で 「Create API key」 をクリック →  AIzaSy で始まる文字列をコピーしてここに貼り付け。
                  </p>
                  {state?.has_gemini_api_key && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600 mt-1">
                      Gemini API キー登録済み
                    </Badge>
                  )}
                </div>

                {error && (
                  <div className="text-sm px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}
                {toast && (
                  <div className="text-sm px-3 py-2 rounded-lg bg-emerald-600/10 text-emerald-700 border border-emerald-600/30">
                    {toast}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    保存
                  </Button>
                  <input
                    ref={testFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleTestFile(f)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testing || !isConfigured}
                    onClick={() => testFileRef.current?.click()}
                    className="gap-1.5"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    テスト送信（画像を選択して即実行）
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* テスト結果 */}
            {test && (
              <Card className={test.ok ? "border-emerald-600/40" : "border-destructive/40"}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {test.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        テスト成功
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        テスト失敗（ステージ: {test.stage}）
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {!test.ok && test.error && (
                    <div className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono text-xs whitespace-pre-wrap">
                      {test.error}
                    </div>
                  )}
                  {test.ok && test.parsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(test.parsed)
                        .filter(([, v]) => v != null && v !== "")
                        .map(([k, v]) => (
                          <div key={k} className="text-sm">
                            <span className="text-muted-foreground">{k}: </span>
                            <span className="text-foreground">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {test.raw_text_preview && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">raw_text (先頭 400 文字)</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-foreground font-mono">{test.raw_text_preview}</pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
