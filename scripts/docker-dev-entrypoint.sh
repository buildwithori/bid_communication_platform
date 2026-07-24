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


is_api_command="false"
case " $* " in
  *" @bid/api "*) is_api_command="true" ;;
esac

if [ "$is_api_command" = "true" ] && [ "${DOCKER_PRISMA_SETUP:-false}" = "true" ]; then
  while ! mkdir node_modules/.prisma-setup-lock 2>/dev/null; do
    echo "Waiting for Prisma setup lock..."
    sleep 1
  done

  cleanup_prisma_lock() {
    rmdir node_modules/.prisma-setup-lock 2>/dev/null || true
  }
  trap cleanup_prisma_lock EXIT INT TERM

  prisma_checksum_file="node_modules/.prisma-schema.sha256"
  prisma_checksum="$(sha256sum prisma/schema.prisma | awk '{print $1}')"
  saved_prisma_checksum=""

  if [ -f "$prisma_checksum_file" ]; then
    saved_prisma_checksum="$(cat "$prisma_checksum_file")"
  fi

  if [ "$prisma_checksum" != "$saved_prisma_checksum" ]; then
    echo "prisma/schema.prisma changed; regenerating Prisma Client..."
    npm run prisma:generate
    printf '%s' "$prisma_checksum" > "$prisma_checksum_file"
  fi

  if [ "${DOCKER_APPLY_MIGRATIONS:-false}" = "true" ]; then
    echo "Applying Prisma migrations..."
    npx prisma migrate deploy
  fi

  cleanup_prisma_lock
  trap - EXIT INT TERM
fi

exec "$@"
