#!/usr/bin/env bash
# Genera dos zips en la carpeta padre del repo (y copia a descargas/ para versionarlos):
#   1) TaskNest_Clara_BusinessCase.zip  -> paquete completo para quien no es técnico (sin node_modules, .git, etc.)
#   2) tasknest-analyst-skill.zip       -> solo la skill, lista para subir a Claude.ai
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(dirname "$ROOT")"
cd "$ROOT"
rm -f "$OUT/TaskNest_Clara_BusinessCase.zip" "$OUT/tasknest-analyst-skill.zip"
git archive --format=zip --prefix=TaskNest_Clara_BusinessCase/ -o "$OUT/TaskNest_Clara_BusinessCase.zip" HEAD
(cd .claude/skills && zip -qr "$OUT/tasknest-analyst-skill.zip" tasknest-analyst -x '*.DS_Store')
cp "$OUT/TaskNest_Clara_BusinessCase.zip" "$OUT/tasknest-analyst-skill.zip" "$ROOT/descargas/" 2>/dev/null || (mkdir -p "$ROOT/descargas" && cp "$OUT"/TaskNest_Clara_BusinessCase.zip "$OUT"/tasknest-analyst-skill.zip "$ROOT/descargas/")
echo "✅ $OUT/TaskNest_Clara_BusinessCase.zip"
echo "✅ $OUT/tasknest-analyst-skill.zip"
