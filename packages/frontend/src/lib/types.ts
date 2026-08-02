/**
 * 撮影データと API の型は `@hitome/shared` (valibot スキーマ) が持つ。
 * ここに置くのは画面表示のために組み替えた型だけ。
 */
export { ICON_ANGLE } from '@hitome/shared'
export type { BuildSummary, CaptureError, Manifest, ManifestEntry } from '@hitome/shared'

export interface Shot {
  angle: number
  file: string
  url: string
}

/** 武器 x 素材の 1 組み合わせ。全アングルのショットをまとめたもの。 */
export interface Combo {
  /** `${weaponId}:${materialId}` */
  key: string
  weaponId: string
  materialId: string
  name: string
  build: string
  /** 角度 → ショット。アイコンは ICON_ANGLE。 */
  shots: Record<number, Shot>
  angles: number[]
}

export type PairStatus = 'added' | 'removed' | 'shared'

/** 2 ビルド間で突き合わせた 1 行。比較しない場合は b が null。 */
export interface ComboPair {
  key: string
  weaponId: string
  materialId: string
  name: string
  a: Combo | null
  b: Combo | null
  status: PairStatus
  /** 同じ組み合わせなのに表示名が変わった (name_overrides の変更など)。 */
  renamed: boolean
}
