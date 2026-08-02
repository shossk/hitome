import * as v from 'valibot'

/**
 * Godot の撮影ツール (`godot/tools/capture/scripts/capture.gd`) が書き出す
 * manifest.json のスキーマ。ここが撮影側と TS 側の境界になる。
 *
 * `v.object` は未知のキーを落とすだけでエラーにしない。撮影側が項目を増やしても
 * 既存のビルドが読めなくなることはない。
 */

/** アイコン (正面 0 度から生成するサムネイル) を表す擬似角度。 */
export const ICON_ANGLE = -1

/** 角度は 0-359 の整数、またはアイコンを表す -1。 */
export const AngleSchema = v.pipe(v.number(), v.integer(), v.minValue(ICON_ANGLE), v.maxValue(359))

/** ファイル名・ビルド ID に許す文字。パスを跨げない形だけを通す。 */
export const SAFE_SEGMENT = /^[\w.-]+$/

export const BuildIdSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(SAFE_SEGMENT, 'ビルド ID に使えない文字が含まれています'),
)

export const FileNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(SAFE_SEGMENT, 'ファイル名に使えない文字が含まれています'),
)

/** 撮影 1 枚分。武器 x 素材 x 角度で一意になる。 */
export const ManifestEntrySchema = v.object({
  weapon_id: v.pipe(v.string(), v.minLength(1)),
  material_id: v.pipe(v.string(), v.minLength(1)),
  name: v.string(),
  angle: AngleSchema,
  file: FileNameSchema,
  build: v.string(),
})

/** 撮影に失敗した組み合わせ。manifest には残るが画像は無い。 */
export const CaptureErrorSchema = v.object({
  pair: v.string(),
  angle: v.pipe(v.number(), v.integer()),
  code: v.number(),
})

export const ManifestSchema = v.object({
  build: v.string(),
  /** Godot が書く UTC の日時 (タイムゾーン表記なし: "2026-08-01T08:13:10")。 */
  created_at: v.string(),
  angles: v.array(v.pipe(v.number(), v.integer())),
  entries: v.array(ManifestEntrySchema),
  errors: v.optional(v.array(CaptureErrorSchema), []),
})

export type Angle = v.InferOutput<typeof AngleSchema>
export type BuildId = v.InferOutput<typeof BuildIdSchema>
export type ManifestEntry = v.InferOutput<typeof ManifestEntrySchema>
export type CaptureError = v.InferOutput<typeof CaptureErrorSchema>
export type Manifest = v.InferOutput<typeof ManifestSchema>
