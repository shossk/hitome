# @hitome/shared

backend と frontend が共有する **valibot スキーマ**。撮影データと API の契約はここだけに書く。

```text
src/
  manifest.ts  Godot の manifest.json (撮影側との境界)
  api.ts       ギャラリー API のレスポンスとルートパラメータ
  parse.ts     検証ヘルパ (parse / formatIssues)
```

## ビルドしない

`exports` が `./src/index.ts` を直接指している。成果物は作らず、backend は Node の
型ストリップでそのまま実行し、frontend は Vite がソースごとバンドルする。
型チェックには両方とも同じ `typescript-native-bridge` を使う。

そのぶん **`.ts` 拡張子つきの相対 import が必須** (`./manifest.ts`)。Node の実行条件で、
`allowImportingTsExtensions` を各パッケージの tsconfig で有効にしてある。

## 型と検証をひとつにする

型は全てスキーマからの推論 (`v.InferOutput`) で、手書きの interface は置かない。
`ManifestEntry` に項目を足したいときは `ManifestEntrySchema` を直せば、
両パッケージの型と実行時検証が同時に追従する。

```ts
import { ManifestSchema, parse } from '@hitome/shared'

const result = parse(ManifestSchema, json, 'builds/1/manifest.json')
if (!result.ok) return logger.warn(result.message)
result.value // Manifest
```

`parse` は例外を投げず、valibot の `safeParse` と同じく結果を返す。
失敗をどう扱うか (400 を返す / 起動を止める / そのビルドを飛ばす) は呼び出し側が決める。

`v.object` は未知のキーを黙って落とす。撮影側 (Godot) が項目を増やしても、
古い定義のまま読めなくなることはない。

## パス安全性

ビルド ID とファイル名は `SAFE_SEGMENT` (`/^[\w.-]+$/`) を通したスキーマ
(`BuildIdSchema` / `FileNameSchema`) でしか受け取らない。
`..` やスラッシュを含む値はここで弾かれるので、backend のルートは
パストラバーサルを個別に気にしなくてよい。
