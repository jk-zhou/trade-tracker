#!/bin/sh
set -e

# Update UID/GID if provided
if [ -n "$PUID" ] && [ "$(id -u nextjs)" != "$PUID" ]; then
    echo "Updating nextjs UID to $PUID..."
    usermod -o -u "$PUID" nextjs
fi
if [ -n "$PGID" ] && [ "$(getent group nodejs | cut -d: -f3)" != "$PGID" ]; then
    echo "Updating nodejs GID to $PGID..."
    groupmod -o -g "$PGID" nodejs
fi

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/trade-tracker.db"

# Ensure directories exist and are owned by the correct user
mkdir -p "$DATA_DIR"
chown -R nextjs:nodejs "$DATA_DIR"
chown -R nextjs:nodejs /app/.next

# Apply database migrations safely (without accepting data loss)
echo "Applying database migrations to $DB_FILE..."
su-exec nextjs npx prisma migrate deploy 2>/dev/null || {
  echo "No migrations found, using db push (safe mode)..."
  su-exec nextjs npx prisma db push
}

echo "Starting Trade Tracker (as nextjs user)..."
exec su-exec nextjs node server.js
