#!/bin/sh
set -e

# Wait for volume to be ready and push Prisma schema
echo "Applying database schema to /app/data/trade-tracker.db..."
npx prisma db push --accept-data-loss

echo "Starting Trade Tracker..."
exec node server.js
