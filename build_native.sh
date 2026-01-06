#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

if ! command -v native-image >/dev/null 2>&1; then
  echo "native-image not found in PATH. Falling back to jar build. To build native image install GraalVM and native-image."
  cd "$BACKEND_DIR"
  if [ -f mvnw ]; then
    ./mvnw -DskipTests package
  else
    mvn -DskipTests package
  fi
  exit 0
fi

# Build jar first
cd "$BACKEND_DIR"
if [ -f mvnw ]; then
  ./mvnw -DskipTests package
else
  mvn -DskipTests package
fi

JAR_PATH=$(ls target/*.jar | head -n 1)
if [ -z "$JAR_PATH" ]; then
  echo "Jar not found after build"
  exit 1
fi

# Try to build native image (may require additional resource/reflect config)
native-image --no-fallback -jar "$JAR_PATH" -H:Name=worklog-native

echo "Native image built: ./worklog-native"

