#!/usr/bin/env bash
# ローカル実行用ラッパー
#
#   ./run.sh 123                      # build 123 として全撮影
#   ./run.sh 123 stick:rock,sword:meat  # 指定の組み合わせだけ撮影
#
# godot コマンドが PATH にあること (macOS の場合:
#   alias godot="/Applications/Godot.app/Contents/MacOS/Godot" など)

set -euo pipefail
cd "$(dirname "$0")"

BUILD="${1:?usage: ./run.sh <build_number> [only_pairs]}"
ONLY="${2:-}"

ARGS=(--path . -- "--build=${BUILD}")
if [[ -n "$ONLY" ]]; then
  ARGS+=("--only=${ONLY}")
fi

godot "${ARGS[@]}"
echo "→ ../../out/builds/${BUILD}/ に出力されました"
