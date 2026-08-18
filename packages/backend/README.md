# @hitome/backend

撮影結果 (`godot/out/builds`) を配信する API。Fastify + TypeScript (`typescript-native-bridge`)。

## 起動

```sh
pnpm --filter @hitome/backend dev     # node --watch。既定 http://127.0.0.1:8787
pnpm --filter @hitome/backend start
```

**ビルド手順は無い。** Node 26 の型ストリップで `.ts` をそのまま実行する
(`@hitome/shared` も workspace リンク越しにソースのまま読まれる)。
`tsc` は型チェック専用 (`pnpm typecheck`)。

型ストリップの制約から、相対 import は拡張子つき (`./config.ts`) で書き、
enum など消せない構文は使わない (`erasableSyntaxOnly` で強制)。

## 環境変数

| 変数          | 既定                      | 用途                       |
| ------------- | ------------------------- | -------------------------- |
| `PORT`        | `8787`                    |                            |
| `HOST`        | `127.0.0.1`               |                            |
| `BUILDS_DIR`  | `<repo>/godot/out/builds` | 撮影結果の場所             |
| `CORS_ORIGIN` | `http://localhost:5273`   | カンマ区切り。`*` で全許可 |
| `LOG_LEVEL`   | `info`                    |                            |

値は起動時に valibot で検証する。おかしければ理由付きで即落ちる。

## エンドポイント

|                                |                                            |
| ------------------------------ | ------------------------------------------ |
| `GET /health`                  | `{ ok: true }`                             |
| `GET /api/builds`              | ビルド一覧 (新しい順)。`BuildListResponse` |
| `GET /api/builds/:id/manifest` | `Manifest`                                 |
| `GET /media/:id/:file`         | 撮影 PNG                                   |

`/media` は `immutable` で長期キャッシュさせる。同じビルド番号で撮り直しても
frontend が URL に `?v=<created_at>` を付けるので、古い画像を掴み続けることはない。
`/api/*` は `no-store`。

## 壊れた manifest の扱い

ディスク上の `manifest.json` は「Godot がさっき書いたもの」で、撮影途中や
書き込み途中の可能性がある。読むたびに `ManifestSchema` で検証し、
通らないビルドは**一覧から外して warn ログを出す**。

```text
manifest.json の形式が想定と違います (build 3): entries.0.angle Invalid type: Expected number but received "0"
```

半端なデータを画面に出すより、存在しないものとして扱うほうが誤読が少ないという判断。
再撮影して直せば次のリクエストから復帰する。

## 構成

```text
src/
  server.ts  起動と graceful shutdown
  app.ts     Fastify の組み立て (listen しない。テストから inject できる)
  routes.ts  3 つのエンドポイント
  builds.ts  ディレクトリの読み出しと manifest 検証
  config.ts  環境変数
```
