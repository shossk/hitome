import pixelmatch from 'pixelmatch'

/**
 * 2 枚の PNG をブラウザ上でピクセル比較する。
 *
 * 判定は pixelmatch に任せる。YIQ 色空間での知覚的な差で見るので、
 * MSAA によるエッジのゆらぎ (アンチエイリアス由来の差) を拾わない。
 * 撮影のたびに輪郭が 1px 揺れて「差分あり」になる、という誤検知を防ぐのが狙い。
 *
 * 撮影画像は 1024x1024 なので、一覧では縮小サンプル (128px) で
 * 「変わったかどうか」だけを高速に判定し、詳細ビューでは等倍で差分を描画する。
 */

export interface DiffOptions {
  /** 比較解像度。省略時は原寸。 */
  size?: number
  /** pixelmatch の判定閾値 (0-1)。小さいほど敏感。 */
  threshold?: number
}

export interface DiffResult {
  /** 変化したピクセルの割合 (0-1)。 */
  ratio: number
  changedPixels: number
  totalPixels: number
  width: number
  height: number
  /** 元画像の解像度が A/B で食い違っている。 */
  sizeMismatch: boolean
}

/** pixelmatch の既定値。視覚回帰テストで広く使われている値。 */
export const DEFAULT_THRESHOLD = 0.1

/** 差分の描画色 (赤)。背景の市松模様に埋もれない彩度にしてある。 */
const DIFF_COLOR: [number, number, number] = [255, 40, 70]

/** 差分の下敷きにする元画像の濃さ。 */
const BASE_OPACITY = 0.3

const SAMPLE_SIZE = 128

const imageCache = new Map<string, Promise<HTMLImageElement>>()

/** デコード済み画像のキャッシュを捨てる (撮り直しの再読み込み時)。 */
export function clearImageCache(): void {
  imageCache.clear()
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url)
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`画像を読み込めません: ${url}`))
      img.src = url
    })
    pending.catch(() => imageCache.delete(url))
    imageCache.set(url, pending)
  }
  return pending
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function context2d(
  canvas: HTMLCanvasElement,
  willReadFrequently = false,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently })
  if (!ctx) throw new Error('2d コンテキストを取得できません')
  return ctx
}

function pixelsOf(img: HTMLImageElement, width: number, height: number): Uint8ClampedArray {
  const ctx = context2d(createCanvas(width, height), true)
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height).data
}

/** 解像度が違っても比較できるよう、大きいほうに合わせた比較サイズを決める。 */
function targetSize(a: HTMLImageElement, b: HTMLImageElement, size?: number) {
  const naturalWidth = Math.max(a.naturalWidth, b.naturalWidth, 1)
  const naturalHeight = Math.max(a.naturalHeight, b.naturalHeight, 1)
  const scale = size ? size / naturalWidth : 1
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
    sizeMismatch: a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight,
  }
}

export async function diffImages(
  urlA: string,
  urlB: string,
  options: DiffOptions = {},
): Promise<DiffResult> {
  const [imgA, imgB] = await Promise.all([loadImage(urlA), loadImage(urlB)])
  const { width, height, sizeMismatch } = targetSize(imgA, imgB, options.size)

  const changedPixels = pixelmatch(
    pixelsOf(imgA, width, height),
    pixelsOf(imgB, width, height),
    undefined,
    width,
    height,
    { threshold: options.threshold ?? DEFAULT_THRESHOLD },
  )

  const totalPixels = width * height
  return {
    ratio: totalPixels ? changedPixels / totalPixels : 0,
    changedPixels,
    totalPixels,
    width,
    height,
    sizeMismatch,
  }
}

/** 一覧用: 縮小サンプルでの高速判定。 */
export function diffImagesSampled(
  urlA: string,
  urlB: string,
  threshold = DEFAULT_THRESHOLD,
): Promise<DiffResult> {
  return diffImages(urlA, urlB, { size: SAMPLE_SIZE, threshold })
}

/**
 * 差分をキャンバスに描画する。
 *
 * pixelmatch の出力をそのまま使うと背景が白く塗り潰されてしまうので、
 * `diffMask` で差分だけを取り出し、薄くしたグレースケールの元画像に重ねる。
 * 透過部分は透過のまま残るので、背景 (市松/暗/明) の切り替えが活きる。
 */
export async function renderDiff(
  canvas: HTMLCanvasElement,
  urlA: string,
  urlB: string,
  threshold = DEFAULT_THRESHOLD,
): Promise<DiffResult> {
  const [imgA, imgB] = await Promise.all([loadImage(urlA), loadImage(urlB)])
  const { width, height, sizeMismatch } = targetSize(imgA, imgB)

  const mask = new Uint8ClampedArray(width * height * 4)
  const changedPixels = pixelmatch(
    pixelsOf(imgA, width, height),
    pixelsOf(imgB, width, height),
    mask,
    width,
    height,
    { threshold, diffMask: true, diffColor: DIFF_COLOR },
  )

  canvas.width = width
  canvas.height = height
  const ctx = context2d(canvas)
  ctx.clearRect(0, 0, width, height)

  // 下敷き: 変化を見やすくするため元画像はグレー・薄めで
  ctx.save()
  ctx.filter = 'grayscale(1)'
  ctx.globalAlpha = BASE_OPACITY
  ctx.drawImage(imgA, 0, 0, width, height)
  ctx.restore()

  // 差分マスクを重ねる (putImageData は合成しないので一度キャンバスに起こす)
  const maskCanvas = createCanvas(width, height)
  context2d(maskCanvas).putImageData(new ImageData(mask, width, height), 0, 0)
  ctx.drawImage(maskCanvas, 0, 0)

  const totalPixels = width * height
  return {
    ratio: totalPixels ? changedPixels / totalPixels : 0,
    changedPixels,
    totalPixels,
    width,
    height,
    sizeMismatch,
  }
}

export function formatRatio(ratio: number): string {
  if (ratio === 0) return '0%'
  if (ratio < 0.0001) return '<0.01%'
  return `${(ratio * 100).toFixed(ratio < 0.01 ? 2 : 1)}%`
}
