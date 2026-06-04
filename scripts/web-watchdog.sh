#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WATCHDOG_PID_FILE="/tmp/aliya-web-watchdog.pid"
WATCHDOG_LOG_FILE="/tmp/aliya-web-watchdog.log"
HEALTH_URL="http://localhost:5174/time-manager"
CHECK_INTERVAL_SEC=10

start_loop() {
  cd "$ROOT_DIR"
  while true; do
    if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      npm run dev:web:start >>"$WATCHDOG_LOG_FILE" 2>&1 || true
    fi
    sleep "$CHECK_INTERVAL_SEC"
  done
}

start() {
  if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
    echo "watchdog already running (pid: $(cat "$WATCHDOG_PID_FILE"))"
    return 0
  fi
  nohup bash "$0" loop >>"$WATCHDOG_LOG_FILE" 2>&1 & echo $! >"$WATCHDOG_PID_FILE"
  sleep 0.3
  if kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
    echo "watchdog started (pid: $(cat "$WATCHDOG_PID_FILE"))"
    echo "health: $HEALTH_URL"
    echo "log: $WATCHDOG_LOG_FILE"
  else
    echo "watchdog failed to start; log: $WATCHDOG_LOG_FILE"
    exit 1
  fi
}

stop() {
  if [[ ! -f "$WATCHDOG_PID_FILE" ]]; then
    echo "watchdog is not running"
    return 0
  fi
  local pid
  pid="$(cat "$WATCHDOG_PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" || true
    sleep 0.5
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" || true
    fi
    echo "watchdog stopped (pid: $pid)"
  else
    echo "stale watchdog pid file removed"
  fi
  rm -f "$WATCHDOG_PID_FILE"
}

status() {
  if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
    echo "watchdog running (pid: $(cat "$WATCHDOG_PID_FILE"))"
    echo "health: $HEALTH_URL"
  else
    echo "watchdog stopped"
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  loop) start_loop ;;
  *)
    echo "usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
