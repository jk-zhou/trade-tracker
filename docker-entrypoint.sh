#!/bin/sh
set -e

# Apply database migrations safely (without accepting data loss)
echo "Applying database migrations to /app/data/trade-tracker.db..."
npx prisma migrate deploy 2>/dev/null || {
  echo "No migrations found, using db push (safe mode)..."
  npx prisma db push
}

echo "Starting Trade Tracker..."
exec node server.js
