"use client"

// クライアントサイド PDF → 画像分割ユーティリティ
// pdfjs-dist は SSR で動かないため、必ず動的 import で読み込む

export type PdfPageImage = {
  pageNumber: number
  base64: string // data:image/jpeg;base64,...
}

export async function pdfFileToPageImages(
  file: File,
  options?: {
    scale?: number
    quality?: number
    onProgress?: (current: number, total: number) => void
  }
): Promise<PdfPageImage[]> {
  if (typeof window === 'undefined') {
    throw new Error('PDF処理はブラウザ上でのみ可能です')
  }

  const scale = options?.scale ?? 2
  const quality = options?.quality ?? 0.92

  // 動的 import（webpack ライセンスを回避するため legacy build を使う）
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // worker 設定（CDN を利用：バンドル肥大を避ける）
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const version: string = pdfjs.version
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`
  }

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    disableFontFace: false,
  })

  const pdf = await loadingTask.promise
  const total = pdf.numPages
  const results: PdfPageImage[] = []

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D コンテキストを取得できませんでした')
    }

    await page.render({ canvasContext: ctx, viewport }).promise

    const base64 = canvas.toDataURL('image/jpeg', quality)
    results.push({ pageNumber: i, base64 })

    // 解放
    canvas.width = 0
    canvas.height = 0
    page.cleanup?.()

    options?.onProgress?.(i, total)
  }

  await pdf.cleanup?.()
  await pdf.destroy?.()

  return results
}
