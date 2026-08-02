import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { ManifestSchema, SAFE_SEGMENT, parse } from '@hitome/shared'
import type { BuildSummary, Manifest } from '@hitome/shared'

/**
 * 撮影結果ディレクトリの読み出し。
 *
 * ディスク上の manifest.json は「Godot がさっき書いたもの」であって信用できるとは
 * 限らない (撮影中・書き込み途中・古い形式)。ここで必ずスキーマ検証を通し、
 * 壊れているビルドは一覧から外す。
 */

export interface BuildsRepository {
  list(): Promise<BuildSummary[]>
  readManifest(id: string): Promise<Manifest | null>
  mediaFile(id: string, file: string): Promise<{ path: string; size: number } | null>
}

export interface RepositoryLogger {
  warn(message: string): void
}

export function createBuildsRepository(
  buildsDir: string,
  logger: RepositoryLogger,
): BuildsRepository {
  async function loadManifest(id: string): Promise<Manifest | null> {
    let raw: string
    try {
      raw = await readFile(join(buildsDir, id, 'manifest.json'), 'utf8')
    } catch {
      return null
    }

    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch (cause) {
      logger.warn(`manifest.json を JSON として読めません (build ${id}): ${String(cause)}`)
      return null
    }

    const result = parse(ManifestSchema, json, `manifest.json の形式が想定と違います (build ${id})`)
    if (!result.ok) {
      logger.warn(result.message)
      return null
    }
    return result.value
  }

  return {
    async list() {
      let dirents
      try {
        dirents = await readdir(buildsDir, { withFileTypes: true })
      } catch {
        // 未撮影でも API としては空配列を返す (フロントは空状態を出せる)
        return []
      }

      const ids = dirents
        .filter((dirent) => dirent.isDirectory() && SAFE_SEGMENT.test(dirent.name))
        .map((dirent) => dirent.name)

      const summaries = await Promise.all(
        ids.map(async (id): Promise<BuildSummary | null> => {
          const manifest = await loadManifest(id)
          if (!manifest) return null
          return {
            id,
            createdAt: manifest.created_at,
            entryCount: manifest.entries.length,
            errorCount: manifest.errors.length,
          }
        }),
      )

      return summaries
        .filter((summary) => summary !== null)
        .sort((a, b) => compareBuildId(b.id, a.id))
    },

    readManifest: loadManifest,

    async mediaFile(id, file) {
      const path = join(buildsDir, id, file)
      try {
        const stats = await stat(path)
        return stats.isFile() ? { path, size: stats.size } : null
      } catch {
        return null
      }
    },
  }
}

/** ビルド番号は数値が基本だが、文字列 ID でも壊れないように比較する。 */
export function compareBuildId(a: string, b: string): number {
  const numberA = Number(a)
  const numberB = Number(b)
  if (Number.isFinite(numberA) && Number.isFinite(numberB) && numberA !== numberB) {
    return numberA - numberB
  }
  return a.localeCompare(b, undefined, { numeric: true })
}
