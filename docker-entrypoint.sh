#!/bin/sh
set -e

# Apply database migrations safely (without accepting data loss)
echo "Applying database migrations to /app/data/trade-tracker.db..."
./node_modules/prisma/build/index.js migrate deploy 2>/dev/null || {
  echo "No migrations found, using db push (safe mode)..."
  ./node_modules/prisma/build/index.js db push
}

echo "Starting Trade Tracker..."
exec node server.js
