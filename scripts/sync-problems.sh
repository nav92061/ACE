#!/usr/bin/env bash
# Copy shared problem generators into Cloud Functions so the server uses the same templates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/functions/src/problems"
rm -rf "$DEST"
mkdir -p "$DEST/generators"

cp "$ROOT/src/types/index.ts" "$DEST/types.ts"
cp "$ROOT/src/lib/problems/random.ts" "$DEST/random.ts"
cp "$ROOT/src/lib/problems/checker.ts" "$DEST/checker-client.ts"
cp "$ROOT/src/lib/problems/skills.ts" "$DEST/skills.ts"
cp "$ROOT/src/lib/problems/index.ts" "$DEST/index.ts"
cp "$ROOT/src/lib/problems/generators/"*.ts "$DEST/generators/"

# Rewrite path aliases for the functions tree
python3 - <<'PY'
from pathlib import Path
root = Path("functions/src/problems")
replacements = [
    ('from "@/types"', 'from "./types"'),
    ("from '@/types'", "from './types'"),
    ('from "@/lib/problems/skills"', 'from "./skills"'),
]
for path in root.rglob("*.ts"):
    text = path.read_text()
    orig = text
    for a, b in replacements:
        text = text.replace(a, b)
    # Generators live one level deeper
    if "generators" in path.parts:
        text = text.replace('from "./types"', 'from "../types"')
        text = text.replace("from './types'", "from '../types'")
    if path.name == "index.ts":
        text = text.replace('from "./checker"', 'from "./checker-client"')
        text = text.replace("from './checker'", "from './checker-client'")
    if text != orig:
        path.write_text(text)
print("rewrote imports")
PY

echo "Synced problems → functions/src/problems"
