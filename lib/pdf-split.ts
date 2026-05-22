"use client"

// クライアントサイド PDF → 画像分割ユーティリティ
//
// 重要: Next.js + Turbopack/Webpack で fake worker フォールバック失敗を起こさないため、
//   - workerSrc に同オリジン (/pdf.worker.min.mjs) を固定
//   - workerPort に同オリジンから生成した module Worker インスタンスを直接渡す
// の両方を併用する。
// `new URL('pdfjs-dist/...', import.meta.url)` 経由は Turbopack でうまく解決できない場合があり、
// 結果として CDN 取得 → 失敗 → fake worker 不能 となるため使用しない。

export type PdfPageImage = {
  pageNumber: number
  base64: string // data:image/jpeg;base64,...
}

const WORKER_PUBLIC_PATH = '/pdf.worker.min.mjs'

async function loadPdfjs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF処理はブラウザ上でのみ可能です')
  }
  // 通常 (mjs) ビルドを使用。legacy だと worker と API が噛み合わず "Setting up fake worker failed" の原因になる。
  const pdfjs: any = await import('pdfjs-dist/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_PUBLIC_PATH
  return pdfjs
}

function createWorkerPort(): Worker {
  const url = new URL(WORKER_PUBLIC_PATH, window.location.origin).toString()
  return new Worker(url, { type: 'module' })
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

  // 1 ドキュメントごとに専用の Worker を生成して渡す（fake worker 経路を一切通さない）
  const workerPort = createWorkerPort()

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    worker: { port: workerPort } as any,
    isEvalSupported: false,
    disableFontFace: false,
  })

  let pdf: any
  try {
    pdf = await loadingTask.promise
  } catch (err) {
    try { workerPort.terminate() } catch {}
    throw err
  }

  const total = pdf.numPages
  const results: PdfPageImage[] = []

  try {
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
  } finally {
    try { await pdf.cleanup?.() } catch {}
    try { await pdf.destroy?.() } catch {}
    try { workerPort.terminate() } catch {}
  }

  return results
}
