import { resolve } from 'node:path'
import * as v from 'valibot'
import { parse } from '@hitome/shared'
import type { ParseResult } from '@hitome/shared'

/** 既定の撮影出力先。packages/backend/src から見たリポジトリルート。 */
const DEFAULT_BUILDS_DIR = resolve(import.meta.dirname, '../../../godot/out/builds')

const ConfigSchema = v.object({
  port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
  host: v.pipe(v.string(), v.minLength(1)),
  /** 撮影結果 (godot/out/builds) の絶対パス。 */
  buildsDir: v.pipe(v.string(), v.minLength(1)),
  /** 許可するオリジン。'*' で全許可。Vite の proxy 経由なら使われない。 */
  corsOrigin: v.union([v.literal('*'), v.array(v.pipe(v.string(), v.minLength(1)))]),
  logLevel: v.picklist(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
})

export type Config = v.InferOutput<typeof ConfigSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ParseResult<Config> {
  const origin = env.CORS_ORIGIN ?? 'http://localhost:5273'

  return parse(
    ConfigSchema,
    {
      port: Number(env.PORT ?? 8787),
      host: env.HOST ?? '127.0.0.1',
      buildsDir: resolve(env.BUILDS_DIR ?? DEFAULT_BUILDS_DIR),
      corsOrigin: origin === '*' ? '*' : origin.split(',').map((value) => value.trim()),
      logLevel: env.LOG_LEVEL ?? 'info',
    },
    '環境変数',
  )
}
