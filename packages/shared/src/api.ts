import * as v from 'valibot'
import { BuildIdSchema, FileNameSchema } from './manifest.ts'

/**
 * ギャラリー API の契約。backend が返し、frontend が検証する。
 *
 *   GET /api/builds                → BuildListResponse
 *   GET /api/builds/:id/manifest   → Manifest
 *   GET /media/:id/:file           → 画像 (バイナリ)
 */

/** 一覧に出すビルドの要約。manifest 全体を読まずに済ませるための情報。 */
export const BuildSummarySchema = v.object({
  id: BuildIdSchema,
  /** 撮影日時。manifest が壊れている等で不明なら null。 */
  createdAt: v.nullable(v.string()),
  entryCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  errorCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const BuildListResponseSchema = v.object({
  /** 新しい順。 */
  builds: v.array(BuildSummarySchema),
  /** サーバが見ているディレクトリ (デバッグ表示用)。 */
  buildsDir: v.optional(v.string()),
})

export const ApiErrorSchema = v.object({
  error: v.string(),
})

/** ルートパラメータ。パストラバーサル対策もここに集約する。 */
export const BuildParamsSchema = v.object({
  id: BuildIdSchema,
})

export const MediaParamsSchema = v.object({
  id: BuildIdSchema,
  file: FileNameSchema,
})

export type BuildSummary = v.InferOutput<typeof BuildSummarySchema>
export type BuildListResponse = v.InferOutput<typeof BuildListResponseSchema>
export type ApiError = v.InferOutput<typeof ApiErrorSchema>
export type BuildParams = v.InferOutput<typeof BuildParamsSchema>
export type MediaParams = v.InferOutput<typeof MediaParamsSchema>
