import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
if (!config.ok) {
  console.error(`起動できません — ${config.message}`)
  process.exit(1)
}

const app = await createApp(config.value)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info(`${signal} を受けたので終了します`)
    void app.close().then(() => process.exit(0))
  })
}

try {
  await app.listen({ port: config.value.port, host: config.value.host })
  app.log.info(`撮影結果: ${config.value.buildsDir}`)
} catch (cause) {
  app.log.error(cause)
  process.exit(1)
}
