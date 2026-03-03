#!/usr/bin/env bash
# CDP 用に起動した Chrome（指定ポートで待ち受けているプロセス）を停止する。
set -e

PORT="${CHROME_DEBUG_PORT:-9222}"

kill_port() {
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -i ":${PORT}" 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    echo "Stopped process on port $PORT"
    return
  fi
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port $PORT: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  else
    echo "No process found on port $PORT"
  fi
}

kill_port
