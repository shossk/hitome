import * as v from 'valibot'
import { BuildListResponseSchema, ManifestSchema, parse } from '@hitome/shared'
import type { BuildListResponse, Manifest } from '@hitome/shared'

/**
 * ギャラリー API クライアント。
 *
 * 契約は `@hitome/shared` のスキーマが持ち、受け取った JSON はここで検証する。
 * backend と食い違ったときに「表示がおかしい」ではなく、その場でエラーになる。
 *
 * 開発時は Vite の proxy が backend (既定 127.0.0.1:8787) へ流す。
 * 別オリジンの backend を直接叩く場合は VITE_API_BASE を設定する。
 */
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

async function getJson<TSchema extends v.GenericSchema>(
  path: string,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${path}`)
  }

  // ストアの try/catch に載せたいので、境界であるここで例外にする
  const result = parse(schema, await res.json(), `GET ${path}`)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

export function fetchBuilds(): Promise<BuildListResponse> {
  return getJson('/api/builds', BuildListResponseSchema)
}

export function fetchManifest(buildId: string): Promise<Manifest> {
  return getJson(`/api/builds/${encodeURIComponent(buildId)}/manifest`, ManifestSchema)
}

/**
 * 撮影画像の URL。
 *
 * 同じビルド番号で撮り直すことがあるので、manifest の撮影時刻を version として
 * 付ける。これが無いと `immutable` キャッシュが古い画像を返し続ける。
 */
export function mediaUrl(buildId: string, file: string, version?: string): string {
  const path = `${BASE}/media/${encodeURIComponent(buildId)}/${encodeURIComponent(file)}`
  return version ? `${path}?v=${encodeURIComponent(version)}` : path
}
