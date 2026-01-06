#!/usr/bin/env bash
set -euo pipefail

# Build frontend, copy to backend static, then build backend jar
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/frontend"
BACKEND_STATIC_DIR="$ROOT_DIR/backend/src/main/resources/static"
BACKEND_DIR="$ROOT_DIR/backend"

echo "Building frontend..."
cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build --if-present

echo "Copying frontend build to backend static..."
mkdir -p "$BACKEND_STATIC_DIR"
# remove old static files but keep directory
rm -rf "$BACKEND_STATIC_DIR"/* || true
# detect dist folder
DIST_DIR="$FRONTEND_DIR/dist"
# try common dist output
if [ -d "$DIST_DIR" ]; then
  # pick first child
  FIRST_CHILD=$(find "$DIST_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  if [ -n "$FIRST_CHILD" ]; then
    SRC_DIR="$FIRST_CHILD"
  else
    SRC_DIR="$DIST_DIR"
  fi
else
  SRC_DIR="$FRONTEND_DIR/build"
fi
cp -R "$SRC_DIR"/* "$BACKEND_STATIC_DIR/"

echo "Building backend..."
cd "$BACKEND_DIR"
if [ -f mvnw ]; then
  ./mvnw -DskipTests package
else
  mvn -DskipTests package
fi

echo "Build complete. Jar located in backend/target/"

