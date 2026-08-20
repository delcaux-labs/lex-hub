#!/bin/sh
# docker-entrypoint.sh — Runtime NEXT_PUBLIC_* injection for production.
#
# Next.js inlines NEXT_PUBLIC_* at build time. The Dockerfile builds with
# placeholder strings (__NEXT_PUBLIC_…__). This script replaces them with
# the real values from the container's environment before the server starts.
#
# In dev (docker-compose.yml) the real values are passed as build-args, so
# the placeholders never appear in the bundle and this script is a no-op.

set -e

# Only run replacement if the placeholders are still present in the bundle.
if grep -rq '__NEXT_PUBLIC_SUPABASE_URL__' /app/.next 2>/dev/null; then
  echo "[entrypoint] Injecting runtime NEXT_PUBLIC_* values..."
  find /app/.next -type f -name '*.js' | while read f; do
    sed -i \
      -e "s|__NEXT_PUBLIC_SUPABASE_URL__|${NEXT_PUBLIC_SUPABASE_URL}|g" \
      -e "s|__NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY__|${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY}|g" \
      -e "s|__NEXT_PUBLIC_API_BASE_URL__|${NEXT_PUBLIC_API_BASE_URL}|g" \
      "$f"
  done
fi

exec "$@"
