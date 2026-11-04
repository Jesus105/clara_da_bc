#!/usr/bin/env bash
# Convierte todos los .md del repo (menos la skill) a PDF vía LaTeX (pandoc + xelatex).
# Requisitos: pandoc y una distribución LaTeX con xelatex (TinyTeX / MacTeX).
# Uso: ./scripts/build_pdfs.sh        -> deja cada .pdf junto a su .md
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
HDR="$(mktemp)"
cat > "$HDR" <<'TEX'
\usepackage{etoolbox}
\AtBeginEnvironment{longtable}{\small}
\usepackage{fvextra}
\DefineVerbatimEnvironment{Highlighting}{Verbatim}{breaklines,commandchars=\\\{\}}
\fvset{fontsize=\footnotesize}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyfoot[C]{\small\thepage}
\fancyhead[R]{\small TaskNest · Business Case}
\renewcommand{\headrulewidth}{0.3pt}
\setlength{\parskip}{0.5em}
\setlength{\parindent}{0pt}
\usepackage{titlesec}
\definecolor{tnblue}{HTML}{1F3A93}
\titleformat{\section}{\Large\bfseries\color{tnblue}}{}{0pt}{}[\vspace{-0.3em}\titlerule]
\titleformat{\subsection}{\large\bfseries\color{tnblue}}{}{0pt}{}
\titleformat{\subsubsection}{\normalsize\bfseries}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.4em}{0.6em}
TEX
find . -name '*.md' -not -path './.claude/*' -not -path '*/node_modules/*' | sort | while read -r f; do
  out="${f%.md}.pdf"
  tmp="$(mktemp).md"
  # limpia el md para LaTeX (emojis, título, links, ancho de tablas)
  python3 "$ROOT/scripts/_md_prep.py" "$f" "$tmp"
  title="$(grep -m1 '^# ' "$f" | sed 's/^# //' | python3 -c "import re,sys;print(re.sub('[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]','',sys.stdin.read()).strip())")"
  pandoc "$tmp" -o "$out" --pdf-engine=xelatex -f markdown+pipe_tables+emoji+lists_without_preceding_blankline-tex_math_dollars-raw_tex-implicit_figures -V csquotes=true \
    -V lang=es -V geometry:margin=2.2cm -V fontsize=11pt -V colorlinks=true -V linkcolor=blue -V urlcolor=blue \
    -V mainfont="Arial" -V monofont="Menlo" -V monofontoptions="Scale=0.85" \
    -M title="${title:-$(basename "$f" .md)}" --include-in-header="$HDR" 2>&1 | grep -v "^\[WARNING\] Missing character" || true
  echo "✅ $out"
  rm -f "$tmp"
done
rm -f "$HDR"
