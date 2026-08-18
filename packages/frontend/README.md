# @hitome/frontend

Godot の撮影ツール (`godot/tools/capture`) が出力した画像を、**ビルドごとに並べて比較する**ギャラリー。

Vue 3 + Vite + Pinia + shadcn-vue (reka-ui / Tailwind v4)。

## 起動

画像は backend (`@hitome/backend`) が配信するので、2 つ動かす。

```sh
pnpm dev                      # リポジトリルート。backend と frontend を同時に起動
```

個別に動かす場合:

```sh
pnpm --filter @hitome/backend dev    # http://127.0.0.1:8787
pnpm --filter @hitome/frontend dev   # http://localhost:5273
```

撮影は `./godot/tools/capture/run.sh <build番号>`。撮影結果の場所は backend 側の
`BUILDS_DIR` で変えられる (既定 `godot/out/builds`)。

## データの取得先

開発サーバは `/api` と `/media` を backend に proxy する (`vite.config.ts`)。
proxy 先は `HITOME_API` で変更可能。別オリジンの backend を直接叩く場合は
`VITE_API_BASE` を設定する (backend 側の `CORS_ORIGIN` も要調整)。

エンドポイントの契約とレスポンスの型は `@hitome/shared` の valibot スキーマが持つ。
`src/lib/api.ts` は受け取った JSON を必ずスキーマで検証してから返すので、
backend と食い違ったらその場でエラーになる。

| エンドポイント                 | 返すもの                            |
| ------------------------------ | ----------------------------------- |
| `GET /api/builds`              | `BuildListResponse` (新しい順)      |
| `GET /api/builds/:id/manifest` | `Manifest` (Godot が書いた形のまま) |
| `GET /media/:id/:file`         | 撮影 PNG                            |

## 画面

- **ヘッダ**: 「表示」= 見ているビルド、「比較元」= 1 つ前のビルド。比較元を「比較しない」にすると単一ビルドのギャラリーになる。
- **ツールバー**: 名前/ID 検索、武器・素材の絞り込み、角度 (0/90/180/270/アイコン)、差分ありのみ、並び替え、背景 (市松/暗/明)、サムネイルの大きさ。
- **グリッド**: カードにマウスを乗せると比較元の画像に切り替わる。バッジで `新規` / `削除` / `名称変更` / 差分割合を表示。
- **詳細ダイアログ** (カードをクリック): `並べて` / `スライダー` / `差分` / `点滅` の 4 モード。`←` `→` で前後の組み合わせに移動。

## 差分の出し方

`src/lib/imageDiff.ts` が canvas + [pixelmatch](https://github.com/mapbox/pixelmatch) で比較する (サーバ側の処理は不要)。

- 一覧: 128px に縮小したサンプルで「変わったか」を高速判定 (同時 4 件まで、画面に入ったものだけ)
- 詳細の `差分` モード: 等倍で再計算し、変化した箇所を赤く描画

閾値は `DEFAULT_THRESHOLD` (0.1 = pixelmatch の既定値)。判定は YIQ 色空間の知覚的な差で、
アンチエイリアス由来のピクセルは差分として数えない。MSAA を有効にして撮っているので、
輪郭が 1px 揺れただけで「差分あり」になるのを防いでいる。

描画は `diffMask` で差分だけを取り出し、薄いグレースケールの元画像に重ねている
(pixelmatch の既定出力は背景が白く塗り潰されるため。透過部分を残して背景切り替えを活かす)。

## 構成

```text
src/
  lib/        api クライアント / manifest の畳み込み / 画像差分 / 表示用の型
  stores/     gallery (ビルドと manifest) / viewer (表示設定) / diff (差分キャッシュ)
  composables/useFilteredPairs (フィルタ・並び替え)
  components/ 画面部品 (ui/ は shadcn-vue が生成したもの)
```

撮影データと API の型は `@hitome/shared` にある。`src/lib/types.ts` はそれを再エクスポートしつつ、
画面側だけで使う組み替え後の型 (`Combo` / `ComboPair`) を足している。

## メモ

- shadcn-vue (nova) のコンポーネントは `data-checked` / `data-open` を前提にしているが、
  reka-ui 2.10 が出すのは `data-state="checked"`。両方に効くよう `src/assets/index.css` で
  カスタムバリアントを定義している (これが無いと Switch が透明になる)。
- 撮影画像は透過 PNG なので、背景 (市松/暗/明) を切り替えて確認できるようにしてある。
