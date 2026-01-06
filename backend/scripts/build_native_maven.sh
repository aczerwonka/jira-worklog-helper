#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure GraalVM native-image is available
if ! command -v native-image >/dev/null 2>&1; then
  echo "native-image not found in PATH. Install GraalVM and native-image or use build_native.sh fallback."
  exit 1
fi

# Run maven with native profile
if [ -f mvnw ]; then
  ./mvnw -Pnative -DskipTests package
else
  mvn -Pnative -DskipTests package
fi

echo "If everything went well, native image should be in the target folder or project root depending on plugin config."

