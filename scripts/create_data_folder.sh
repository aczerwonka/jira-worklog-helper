#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
mkdir -p "$DATA_DIR"
cat > "$DATA_DIR/favorite_tickets.csv" <<'CSV'
1,PROJ-1,Project One
2,PROJ-2,Project Two
CSV
cat > "$DATA_DIR/rules_mappings.csv" <<'CSV'
work,WK,Work default comment
bug,BG,Bug default comment
CSV
cat > "$DATA_DIR/suggested_prefixes.csv" <<'CSV'
FE
BE
OPS
CSV

echo "Created sample CSVs in $DATA_DIR"

