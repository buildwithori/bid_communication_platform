#!/bin/sh
set -eu

cd /workspace

checksum_file="node_modules/.package-lock.sha256"
current_checksum="$(sha256sum package-lock.json | awk '{print $1}')"
saved_checksum=""

if [ -f "$checksum_file" ]; then
  saved_checksum="$(cat "$checksum_file")"
fi

if [ "$current_checksum" != "$saved_checksum" ]; then
  mkdir -p node_modules

  while ! mkdir node_modules/.install-lock 2>/dev/null; do
    echo "Waiting for dependency install lock..."
    sleep 1
  done

  cleanup_lock() {
    rmdir node_modules/.install-lock 2>/dev/null || true
  }
  trap cleanup_lock EXIT INT TERM

  saved_checksum=""
  if [ -f "$checksum_file" ]; then
    saved_checksum="$(cat "$checksum_file")"
  fi

  if [ "$current_checksum" != "$saved_checksum" ]; then
    echo "package-lock.json changed; refreshing workspace dependencies..."
    npm install
    printf '%s' "$current_checksum" > "$checksum_file"
  fi

  cleanup_lock
  trap - EXIT INT TERM
fi

exec "$@"
