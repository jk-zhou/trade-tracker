#!/bin/sh
set -e

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/trade-tracker.db"

# Check if data directory is writable
if [ ! -w "$DATA_DIR" ]; then
  echo "ERROR: Data directory $DATA_DIR is not writable by user $(whoami) (UID $(id -u))."
  echo "If you are using a Docker volume, please ensure the host directory has the correct permissions."
  echo "Run 'chown -R 1001:1001 /path/to/your/host/data' on your host machine."
  exit 1
fi

# Apply database migrations safely (without accepting data loss)
echo "Applying database migrations to $DB_FILE..."
npx prisma migrate deploy 2>/dev/null || {
  echo "No migrations found, using db push (safe mode)..."
  npx prisma db push
}

echo "Starting Trade Tracker..."
exec node server.js
