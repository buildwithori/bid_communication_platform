#!/bin/sh
set -eu

umask 077
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

backup_directory="${BACKUP_DIRECTORY_IN_CONTAINER:-/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="bid-hub-${timestamp}.dump"
destination="${backup_directory}/${filename}"

mkdir -p "${backup_directory}"

pg_dump \
  --host="${PGHOST:-postgres}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${destination}"

psql \
  --host="${PGHOST:-postgres}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --set=ON_ERROR_STOP=1 \
  --command="
    INSERT INTO deployment_task_runs (key, completed_at, details)
    VALUES (
      'database-backup-latest',
      NOW(),
      jsonb_build_object('filename', '${filename}')
    )
    ON CONFLICT (key) DO UPDATE
    SET completed_at = EXCLUDED.completed_at,
        details = EXCLUDED.details;
  "

echo "Production database backup completed: ${destination}"
