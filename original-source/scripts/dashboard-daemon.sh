#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="/tmp/aliya-dashboard.pid"
LOG_FILE="/tmp/aliya-dashboard.log"
PORT=5175
HEALTH_URL="http://127.0.0.1:${PORT}/dashboard/index.html"

running_pid() {
  lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

is_healthy() {
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1
}

start() {
  local active_pid
  active_pid="$(running_pid)"
  if [[ -n "$active_pid" ]] && is_healthy; then
    echo "dashboard already running (pid: $active_pid)"
    exit 0
  fi
  cd "$ROOT_DIR"
  nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE"
  for _ in {1..20}; do
    sleep 0.5
    if is_healthy; then
      local new_pid
      new_pid="$(running_pid)"
      if [[ -n "$new_pid" ]]; then
        echo "$new_pid" >"$PID_FILE"
      fi
      echo "dashboard started (pid: $(cat "$PID_FILE"))"
      echo "url: http://localhost:${PORT}/dashboard/index.html"
      echo "log: $LOG_FILE"
      return 0
    fi
  done
  echo "dashboard failed to become healthy; check log: $LOG_FILE"
  exit 1
}

stop() {
  local active_pid
  active_pid="$(running_pid)"
  if [[ -n "$active_pid" ]]; then
    kill "$active_pid" || true
    sleep 1
    if kill -0 "$active_pid" 2>/dev/null; then
      kill -9 "$active_pid" || true
    fi
    rm -f "$PID_FILE"
    echo "dashboard stopped (pid: $active_pid)"
    return 0
  fi
  if [[ ! -f "$PID_FILE" ]]; then
    echo "dashboard is not running"
    return 0
  fi
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    sleep 1
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" || true
    fi
    echo "dashboard stopped (pid: $PID)"
  else
    echo "stale pid file removed"
  fi
  rm -f "$PID_FILE"
}

status() {
  local active_pid
  active_pid="$(running_pid)"
  if [[ -n "$active_pid" ]] && is_healthy; then
    echo "running (pid: $active_pid)"
    echo "url: http://localhost:${PORT}/dashboard/index.html"
  else
    echo "stopped"
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *)
    echo "usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

