import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createBuildsRepository } from './builds.ts'
import { registerRoutes } from './routes.ts'
import type { Config } from './config.ts'
import type { FastifyInstance } from 'fastify'

/**
 * アプリ本体の組み立て。listen はしない (テストから inject で叩けるように)。
 */
export async function createApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel },
    // 撮影結果を返すだけなのでリクエストボディは受け取らない
    bodyLimit: 1024,
  })

  await app.register(cors, { origin: config.corsOrigin })

  const repository = createBuildsRepository(config.buildsDir, {
    warn: message => app.log.warn(message),
  })
  registerRoutes(app, repository, config.buildsDir)

  return app
}
