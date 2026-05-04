#!/bin/sh
set -e

# Default to 1000 if not provided
USER_ID=${PUID:-1000}
GROUP_ID=${PGID:-1000}

echo "Configuring user permissions... (PUID: $USER_ID, PGID: $GROUP_ID)"

# Update group and user
groupmod -o -g "$GROUP_ID" nodejs > /dev/null 2>&1
usermod -o -u "$USER_ID" nextjs > /dev/null 2>&1

# Ensure data directory and its contents are owned by the app user
# This is crucial for volume mounts that might have incorrect permissions
mkdir -p /app/data
chown -R nextjs:nodejs /app/data
chown -R nextjs:nodejs /app/.next

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/trade-tracker.db"

# Apply database migrations safely (without accepting data loss)
echo "Applying database migrations to $DB_FILE..."
su-exec nextjs npx prisma migrate deploy 2>/dev/null || {
  echo "No migrations found, using db push (safe mode)..."
  su-exec nextjs npx prisma db push
}

echo "Starting Trade Tracker..."
exec su-exec nextjs node server.js
