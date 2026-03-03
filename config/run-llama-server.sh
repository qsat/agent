#!/usr/bin/env bash
# llama-server を OpenClaw 用に起動するスクリプト
# （llama-cli の代わりに HTTP API を提供。OpenClaw は baseUrl http://host.docker.internal:21434 で接続）
#
# 前提: llama.cpp をビルドし、llama-server が PATH にあること
# 例: brew install llama.cpp またはビルド後 PATH を通す
#
# 環境変数: LLAMA_MODEL, LLAMA_MMPROJ（省略時は上記 HuggingFace 風パス）
#           LLAMA_PORT（省略時 21434）。ローカルファイルの場合は絶対パスを指定可

set -e

MODEL="${LLAMA_MODEL:-~/unsloth/Qwen3.5-35B-A3B-GGUF/Qwen3.5-35B-A3B-UD-Q4_K_XL.gguf}"
MMPROJ="${LLAMA_MMPROJ:-~/unsloth/Qwen3.5-35B-A3B-GGUF/unsloth_Qwen3.5-35B-A3B-GGUF_mmproj-BF16.gguf}"
PORT="${LLAMA_PORT:-21434}"

exec llama-server \
  --model "$MODEL" \
  --mmproj "$MMPROJ" \
  --port "$PORT" \
  --seed 3407 \
  --temp 1.0 \
  --top-p 0.95 \
  --min-p 0.01 \
  --top-k 40
# exec llama-server \
#     --model "~/unsloth/gpt-oss-20B-F16-GGUF/unsloth_gpt-oss-20b-GGUF_gpt-oss-20b-F16.gguf" \
#     --port "$PORT" \
#     --ctx-size 16384 \
#     --seed 3407 \
#     --temp 1.0 \
#     --top-p 1.0 \
#     --top-k 0
