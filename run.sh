#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR_PATH=$(ls "$ROOT_DIR/backend/target"/*.jar 2>/dev/null | sort | tail -n 1 || true)
if [ -z "$JAR_PATH" ]; then
  echo "Jar not found. Build first with ./build_all.sh"
  exit 1
fi
# Print info about .env
if [ -f "$ROOT_DIR/.env" ]; then
  echo "Using .env from: $ROOT_DIR/.env"
fi

java -jar "$JAR_PATH" "$@"

