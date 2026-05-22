"use client"

// クライアントサイド PDF → 画像分割ユーティリティ
// Next.js + Turbopack/Webpack で確実に worker を起動するため、
// new Worker(new URL(...), { type: 'module' }) で明示的にワーカーを渡す。

export type PdfPageImage = {
  pageNumber: number
  base64: string // data:image/jpeg;base64,...
}

let pdfjsLibPromise: Promise<any> | null = null

async function loadPdfjs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF処理はブラウザ上でのみ可能です')
  }
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      // メインモジュール（mjs）。Turbopack/Webpack 5 ともに module worker をバンドルできる版
      const pdfjs: any = await import('pdfjs-dist/build/pdf.mjs')

      // 1) workerSrc を public 配信のローカルファイルに固定（fake worker フォールバック時にも CDN を見ない）
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

      // 2) 可能であれば、本物のワーカーを workerPort として直接渡す
      try {
        // Turbopack/Webpack はこの URL をビルド時に解決し、worker チャンクを生成する
        const workerUrl = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        )
        const worker = new Worker(workerUrl, { type: 'module' })
        pdfjs.GlobalWorkerOptions.workerPort = worker
      } catch (e) {
        // 失敗しても workerSrc によるフォールバックが効く
        console.warn('[pdf-split] inline worker 起動失敗、workerSrc にフォールバック:', e)
      }

      return pdfjs
    })()
  }
  return pdfjsLibPromise
}

export async function pdfFileToPageImages(
  file: File,
  options?: {
    scale?: number
    quality?: number
    onProgress?: (current: number, total: number) => void
  },
): Promise<PdfPageImage[]> {
  const scale = options?.scale ?? 2
  const quality = options?.quality ?? 0.92

  const pdfjs = await loadPdfjs()

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

    canvas.width = 0
    canvas.height = 0
    page.cleanup?.()

    options?.onProgress?.(i, total)
  }

  await pdf.cleanup?.()
  await pdf.destroy?.()

  return results
}
