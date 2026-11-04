"""Prepara un .md para pandoc/LaTeX: quita emojis y el H1 (va como título),
apunta links .md -> .pdf, quita anclas internas y reparte el ancho de las columnas
de las tablas según su contenido (pandoc usa los guiones del separador)."""
import re, sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
s = re.sub("[\U0001F000-\U0001FAFF☀-➿⭐️‍]", "", s)
s = re.sub(r"\]\((?!https?:|#|mailto:)[^)]*\.md\)", lambda m: m.group(0).replace(".md)", ".pdf)"), s)
s = re.sub(r"\[([^\]]+)\]\(#[^)]*\)", r"\1", s)          # anclas internas -> texto
s = re.sub(r"^# .*\n", "", s, count=1, flags=re.M)       # H1 = título del PDF

def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]

def weight(c):
    code = sum(len(x) for x in re.findall(r"`([^`]*)`", c))
    return len(c) - code + 2.0 * code

out, lines, i = [], s.split("\n"), 0
in_code = False
while i < len(lines):
    l = lines[i]
    if l.lstrip().startswith("```"):
        in_code = not in_code
    sep = lines[i + 1] if i + 1 < len(lines) else ""
    if not in_code and "|" in l and re.fullmatch(r"\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*", sep):
        j, rows = i, []
        while j < len(lines) and "|" in lines[j]:
            rows.append(lines[j]); j += 1
        body = [cells(r) for k, r in enumerate(rows) if k != 1]
        n = len(cells(rows[0]))
        mx = [0.0] * n
        codecol = [False] * n
        for r in body:
            for k in range(min(n, len(r))):
                mx[k] = max(mx[k], weight(r[k]))
                if re.search(r"`[^`]{20,}`", r[k]):
                    codecol[k] = True
        # el contenido largo se envuelve: topamos y damos un mínimo
        w = [max(5, min(m, 110 if codecol[k] else 36)) for k, m in enumerate(mx)]
        al = cells(sep)
        newsep = []
        for k in range(n):
            d = max(3, round(w[k] * 70 / sum(w)))
            a = al[k] if k < len(al) else "---"
            newsep.append((":" if a.startswith(":") else "") + "-" * d + (":" if a.endswith(":") else ""))
        out.append(rows[0]); out.append("|" + "|".join(newsep) + "|"); out.extend(rows[2:])
        i = j
        continue
    out.append(l); i += 1
open(dst, "w", encoding="utf-8").write("\n".join(out))
