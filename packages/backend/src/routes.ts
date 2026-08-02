import { createReadStream } from 'node:fs'
import { extname } from 'node:path'
import { BuildParamsSchema, MediaParamsSchema, parse } from '@hitome/shared'
import type { FastifyInstance } from 'fastify'
import type { BuildsRepository } from './builds.ts'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

/** 撮影済みビルドの中身は変わらない。URL に ?v=<created_at> が付く前提で長期キャッシュ。 */
const IMMUTABLE = 'public, max-age=31536000, immutable'

export function registerRoutes(
  app: FastifyInstance,
  repository: BuildsRepository,
  buildsDir: string,
): void {
  app.get('/health', async () => ({ ok: true }))

  app.get('/api/builds', async (_request, reply) => {
    const builds = await repository.list()
    return reply.header('Cache-Control', 'no-store').send({ builds, buildsDir })
  })

  app.get('/api/builds/:id/manifest', async (request, reply) => {
    const params = parse(BuildParamsSchema, request.params)
    if (!params.ok) return reply.code(400).send({ error: params.message })

    const manifest = await repository.readManifest(params.value.id)
    if (!manifest) {
      return reply.code(404).send({ error: `manifest が見つかりません: ${params.value.id}` })
    }
    // 撮り直しで同じビルド番号の中身が変わるので manifest はキャッシュしない
    return reply.header('Cache-Control', 'no-store').send(manifest)
  })

  app.get('/media/:id/:file', async (request, reply) => {
    const params = parse(MediaParamsSchema, request.params)
    if (!params.ok) return reply.code(400).send({ error: params.message })

    const { id, file } = params.value
    const found = await repository.mediaFile(id, file)
    if (!found) return reply.code(404).send({ error: `見つかりません: ${id}/${file}` })

    return reply
      .header('Content-Type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream')
      .header('Content-Length', String(found.size))
      .header('Cache-Control', IMMUTABLE)
      .send(createReadStream(found.path))
  })
}
