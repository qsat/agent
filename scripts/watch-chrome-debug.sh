#!/usr/bin/env bash
# 一定間隔で start-chrome-debug.sh を実行し、CDP 用 Chrome が常に起動している状態を保つ。
# 使用例:
#   ./scripts/watch-chrome-debug.sh           # 60 秒間隔
#   ./scripts/watch-chrome-debug.sh 120       # 120 秒間隔
#   CHROME_WATCH_INTERVAL=30 ./scripts/watch-chrome-debug.sh
set -e

SCRIPT_DIR="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
INTERVAL="${CHROME_WATCH_INTERVAL:-${1:-60}}"

if [[ ! "$INTERVAL" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [INTERVAL_SECONDS]" >&2
  echo "  or set CHROME_WATCH_INTERVAL" >&2
  exit 1
fi

echo "Watching Chrome CDP every ${INTERVAL}s (Ctrl+C to stop)"
while true; do
  CHROME_BACKGROUND=1 "$SCRIPT_DIR/start-chrome-debug.sh" || true
  sleep "$INTERVAL"
done
