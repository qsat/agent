#!/usr/bin/env bash
# ホストで Chrome を新規プロファイル・リモートデバッグ有効で起動する。
# 既に CDP が応答している場合は何もしない。ポートは開いているが応答しない場合は再起動する。
# OpenClaw の playwright-cli スキルが CDP でこの Chrome に接続する。
#
# 一定間隔で起動を保つ場合: CHROME_BACKGROUND=1 でバックグラウンド起動（exec しない）。
# 例: scripts/watch-chrome-debug.sh でループ実行、または cron で CHROME_BACKGROUND=1 を付けて実行。
set -e

PORT="${CHROME_DEBUG_PORT:-9222}"
BACKGROUND="${CHROME_BACKGROUND:-0}"
USER_DATA_DIR="${CHROME_USER_DATA_DIR:-$HOME/.chrome-openclaw}"

case "$(uname -s)" in
  Darwin)
    CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
    ;;
  Linux)
    CHROME="${CHROME:-google-chrome}"
    ;;
  *)
    echo "Unsupported OS. Set CHROME to your Chrome executable."
    exit 1
    ;;
esac

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME"
  echo "Set CHROME=... or install Google Chrome."
  exit 1
fi

# CDP の /json/version が応答するか確認
check_cdp_ok() {
  curl -sf --connect-timeout 2 --max-time 5 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1
}

# 指定ポートを使っているプロセスを終了
kill_port() {
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -i ":${PORT}" 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    # Linux: fuser -k でポート使用プロセスを終了（数字だけ返すことがあるので -k で直接終了）
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 1
    return
  fi
  if [[ -n "$pids" ]]; then
    echo "Killing process(es) on port $PORT: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

if check_cdp_ok; then
  echo "Chrome CDP is already running on port $PORT. Nothing to do."
  exit 0
fi

# ポートは使われているが CDP が応答しない、または未起動
kill_port

echo "Starting Chrome with remote debugging on port $PORT"
echo "User data dir: $USER_DATA_DIR"
if [[ "$BACKGROUND" == "1" || "$BACKGROUND" == "true" ]]; then
  "$CHROME" \
    --remote-debugging-port="$PORT" \
    --remote-debugging-address=0.0.0.0 \
    --user-data-dir="$USER_DATA_DIR" \
    "$@" >/dev/null 2>&1 &
  echo "Chrome started in background (PID $!)"
  exit 0
fi
exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --remote-debugging-address=0.0.0.0 \
  --user-data-dir="$USER_DATA_DIR" \
  "$@"
