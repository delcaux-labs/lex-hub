#!/usr/bin/env bash
set -euo pipefail

# SYNOPSIS:
#   Builds multi-arch (linux/amd64) Docker images for Lex-Hub Backend & Frontend
#   and pushes them to a SINGLE Docker Hub repository using tag prefixes.
#   Example: fadelmamar/lex-hub:backend-latest & fadelmamar/lex-hub:frontend-latest

DOCKER_USER="${DOCKER_USER:-fadelmamar}"
REPO_NAME="${REPO_NAME:-lex-hub}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

FULL_REPO="$DOCKER_USER/$REPO_NAME"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [ -f "$REPO_ROOT/.env" ]; then
  echo "==> Loading .env defaults..."
  export $(grep -v '^#' "$REPO_ROOT/.env" | xargs -0 2>/dev/null || true)
fi

NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:54321}"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:-}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3001}"

echo "==> Single Docker Hub Repository: $FULL_REPO"
echo "==> Target Tag Suffix: $TAG"
echo "==> Platform: $PLATFORM"

# Setup buildx builder
BUILDER_NAME="lexhub-builder"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
  docker buildx create --name "$BUILDER_NAME" --use
else
  docker buildx use "$BUILDER_NAME"
fi
docker buildx inspect --bootstrap

# 1. Build and push Backend
BACKEND_IMG="$FULL_REPO:backend-$TAG"
echo "==> [1/2] Building and Pushing Backend Image: $BACKEND_IMG..."
docker buildx build \
  --platform "$PLATFORM" \
  -t "$BACKEND_IMG" \
  --push \
  "$REPO_ROOT/backend"

# 2. Build and push Frontend
FRONTEND_IMG="$FULL_REPO:frontend-$TAG"
echo "==> [2/2] Building and Pushing Frontend Image: $FRONTEND_IMG..."
docker buildx build \
  --platform "$PLATFORM" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
  -t "$FRONTEND_IMG" \
  --push \
  "$REPO_ROOT/frontend"

echo " Successfully built and pushed both images to $FULL_REPO:"
echo "  - $BACKEND_IMG"
echo "  - $FRONTEND_IMG"
