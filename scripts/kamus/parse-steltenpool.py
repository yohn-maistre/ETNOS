#!/usr/bin/env python3
"""Parse Steltenpool 1969 (Ekagi-Dutch-English-Indonesian Dictionary) PDF into entries.

Usage: python3 -I parse-steltenpool.py <pdf> <out.json>
Needs poppler's pdftotext. Deterministic: no model, no glosses edited.
Layout: two columns per page; a headword entry starts on a flush-left line
(x close to the column's left edge) and looks like `lemma [= variant (X)] [(X)]:`.
Indented lines are continuation, sub-entries and examples (not imported).
"""
import re, subprocess, sys, json, statistics, tempfile, os

pdf, out = sys.argv[1], sys.argv[2]
tmp = tempfile.mkdtemp()
bb = os.path.join(tmp, "bbox.html")
subprocess.run(["pdftotext", "-bbox-layout", pdf, bb], check=True)
html = open(bb, encoding="utf-8").read()
pages = re.split(r'<page ', html)[1:]

def unesc(s):
    return (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
             .replace("&quot;", '"').replace("&#39;", "'").replace("&apos;", "'"))

LINE = re.compile(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', re.S)
WORD = re.compile(r'>([^<]*)</word>')

DIAL = r'\((?:[PKM]|[PKM]\s*,\s*[PKM]|[PKM]/[PKM])\)'
HEAD = re.compile(r'^(-?[^\s:=()]+)((?:\s*=\s*[^\s:=()]+(?:\s*' + DIAL + r')?)*)(\s*' + DIAL + r')?\s*:\s*(.*)$')

SUB = re.compile(r'^(?!\d+\.|Zie|zie)[^\s:]+(?:\s+[^\s:]+){0,5}\s*:(\s|$)')
entries = []
stats = {"pages": 0}
for pi, pg in enumerate(pages, start=1):
    lines = []
    for x0, y0, x1, y1, body in LINE.findall(pg):
        words = [unesc(w) for w in WORD.findall(body)]
        lines.append((float(x0), float(y0), float(x1), " ".join(words)))
    # printed page number: digits in header band
    hdr = [l for l in lines if l[1] < 50]
    num = None
    for l in hdr:
        m = re.fullmatch(r'\d{1,3}', l[3].strip())
        if m: num = int(m.group()); break
    body = [l for l in lines if l[1] >= 50]
    if num is None or not (1 <= num <= 270) or "EKAGI" not in " ".join(l[3] for l in hdr):
        continue
    stats["pages"] += 1
    for side in (0, 1):
        col = [l for l in body if (l[0] < 218) == (side == 0)]
        col.sort(key=lambda l: l[1])
        for i, l in enumerate(col):
            win = col[max(0, i - 12): i + 13]
            ref = min(w[0] for w in win)
            l_flush = (l[0] - ref) < 2.3
            col[i] = (*l, l_flush)
        # build entries
        cur = None
        for x0, y0, x1, txt, flush in col:
            m = HEAD.match(txt) if flush else None
            if m and not txt[0].isdigit():
                cur = {"page": num, "head": txt[:m.end(3) if m.group(3) else m.end(2)], "lines": [m.group(4)], "headraw": txt,
                       "m": m}
                entries.append(cur)
            elif cur is not None:
                if SUB.match(txt):
                    cur["closed"] = True  # a sub-entry or example begins; the head sense is over
                if not cur.get("closed"):
                    cur["lines"].append(txt)

def join_lines(ls):
    t = ""
    for s in ls:
        s = s.strip()
        if not s: continue
        if t.endswith("-") and re.search(r'[A-Za-zéèëïóáúíö]-$', t) and s[:1].islower():
            t = t[:-1] + s
        elif t:
            t += " " + s
        else:
            t = s
    return t

DIALECTS = {"P": "Panijai", "K": "Kamu", "M": "Mapija"}
POS_NL = {"achtervoegsel": "suffix", "voorvoegsel": "prefix", "voegwoord": "conjunction",
          "bijwoord": "adverb", "voorzetsel": "preposition", "telwoord": "numeral",
          "persoonlijk voornaamwoord": "personal pronoun", "voornaamwoord": "pronoun",
          "tussenwerpsel": "interjection", "partikel": "particle", "bijv. naamwoord": "adjective",
          "naamwoord": "noun", "werkwoord": "verb"}

res = []
for e in entries:
    m = e["m"]
    lemma = m.group(1).strip()
    variants_raw = m.group(2) or ""
    own = re.search(r'\(([PKM](?:\s*[,/]\s*[PKM])*)\)', m.group(3) or "")
    dialect = None
    if own:
        dialect = [DIALECTS[c] for c in re.findall(r'[PKM]', own.group(1))]
    variants = []
    for v in re.finditer(r'=\s*([^\s:=()]+)(?:\s*\(([PKM](?:\s*[,/]\s*[PKM])*)\))?', variants_raw):
        variants.append({"form": v.group(1), **({"dialect": [DIALECTS[c] for c in re.findall(r'[PKM]', v.group(2))]} if v.group(2) else {})})
    text = join_lines(e["lines"])
    # keep only the head sense block: cut at first sub-entry? we keep the whole text of the
    # flush entry block only up to first indented sub-entry (indented lines were appended too),
    # so restrict to numbered senses/first sense below.
    res.append({"lemma": lemma, "dialect": dialect, "variants": variants, "page": e["page"], "text": text})

json.dump({"pages": stats["pages"], "raw": res}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print("pages", stats["pages"], "raw entries", len(res))
