#!/usr/bin/env python3
"""Build seed/kamus/ekari.json from TransNewGuinea.org CLDF + the parsed Steltenpool raw JSON.

Usage: python3 -I build-ekari.py <tng-dir> <steltenpool-raw.json> <out.json>
<tng-dir> holds forms.csv, parameters.csv, languages.csv, sources.bib from
https://github.com/lexibank/transnewguineaorg (cldf/ folder).
"""
import csv, json, re, sys, os

tng, rawp, out = sys.argv[1:4]
GLOTTO = "ekar1243"

def rows(n):
    return list(csv.DictReader(open(os.path.join(tng, n), encoding="utf-8")))

langs = {r["ID"]: r for r in rows("languages.csv") if r["Glottocode"] == GLOTTO}
params = {r["ID"]: r for r in rows("parameters.csv")}
bib = open(os.path.join(tng, "sources.bib"), encoding="utf-8").read()

def bibentry(key):
    m = re.search(r'@\w+\{' + re.escape(key) + r',(.*?)\n\}', bib, re.S)
    f = dict(re.findall(r'\n\s*(\w+)\s*=\s*\{+(.*?)\}+,?(?=\n)', m.group(1) + "\n")) if m else {}
    a = f.get("author", "").replace(" and ", "; ")
    where = f.get("journal") or f.get("booktitle") or ""
    bits = [a, "(" + f["year"] + ")" if "year" in f else "", f.get("title", "")]
    ref = " ".join(b for b in bits if b)
    if where: ref += ". " + where + (" " + f["volume"] if "volume" in f else "") + (": " + f["pages"].replace("--", "-") if "pages" in f else "")
    elif f.get("publisher"): ref += ". " + (f.get("address", "") + ": " if f.get("address") else "") + f["publisher"]
    return ref

entries = []
srcs_used = {}
for r in rows("forms.csv"):
    if r["Language_ID"] not in langs:
        continue
    p = params[r["Parameter_ID"]]
    srcs_used[r["Source"]] = bibentry(r["Source"])
    e = {"lemma": r["Form"], "source": "tng",
         "concept": p["Concepticon_Gloss"] or p["Name"],
         "gloss_en": p["Name"],
         "tng_source": r["Source"], "tng_variety": langs[r["Language_ID"]]["Name"],
         "confidence": "high"}
    if r["Value"] != r["Form"]: e["value_as_given"] = r["Value"]
    if r["Comment"]: e["comment"] = r["Comment"]
    if not p["Concepticon_Gloss"]: e["concept_note"] = "no Concepticon link; TNG concept name used"
    entries.append(e)
n_tng = len(entries)

raw = json.load(open(rawp, encoding="utf-8"))["raw"]
POS = {"achtervoegsel": "suffix", "voorvoegsel": "prefix", "voegwoord": "conjunction",
       "bijwoord": "adverb", "voorzetsel": "preposition", "telwoord": "numeral",
       "voornaamwoord": "pronoun", "persoonlijk voornaamwoord": "pronoun",
       "tussenwerpsel": "interjection", "partikel": "particle",
       "bijvoeglijk naamwoord": "adjective", "locatieve": "locative"}
LEMMA_OK = re.compile(r"^-?[A-Za-z]?[a-zéáíóúüëïöä'-]+$")
DIAL = {"P": "Panijai", "K": "Kamu", "M": "Mapija"}

def modern(l):
    return l.replace("j", "y").replace("J", "Y") if "j" in l.lower() else None

def senses(text):
    # split on numbered senses 1. 2. 3. in order
    parts, pos, n = [], 0, 1
    idx = []
    for m in re.finditer(r'(?:(?<=\s)|^)(\d)\.\s', text):
        if int(m.group(1)) == n:
            idx.append((m.start(), m.end())); n += 1
    if not idx:
        return [(None, text)]
    out = []
    pre = text[:idx[0][0]].strip()
    if pre: out.append((None, pre))
    for i, (s, e) in enumerate(idx):
        end = idx[i + 1][0] if i + 1 < len(idx) else len(text)
        out.append((i + 1, text[e:end].strip()))
    return out

n_steltenpool = {"high": 0, "low": 0}
for r in raw:
    lemma = r["lemma"].replace("·", "-")
    ok_lemma = bool(LEMMA_OK.match(lemma))
    text = r["text"].strip()
    sl = senses(text) if text else [(None, "")]
    for num, st in sl:
        e = {"lemma": lemma}
        m = modern(lemma) if ok_lemma else None
        if m: e["modern"] = m
        if r["dialect"]: e["dialect"] = "/".join(r["dialect"])
        if r["variants"]: e["variants"] = r["variants"]
        if num: e["sense"] = num
        e["source"] = "steltenpool1969"; e["page"] = r["page"]
        conf = "high" if ok_lemma else "low"
        syn = None
        mm = re.match(r'^(?:([PKM])\.\s*)?=\s*([^\s:]+(?:\s*\([PKM]\))?)\s*:\s*(.*)$', st)
        if mm:
            syn = mm.group(2); st = mm.group(3)
            if mm.group(1): e["dialect"] = DIAL[mm.group(1)]
            e["variants"] = (e.get("variants") or []) + [{"form": re.sub(r'\s*\(.*\)', '', syn)}]
        parts = [x.strip() for x in st.split(" - ")] if st else []
        if len(parts) == 3 and all(parts) and ":" not in st and " = " not in st and not st.rstrip().endswith((",", "-", ";")):
            e["gloss_nl"], e["gloss_en"], e["gloss_id"] = parts
        else:
            conf = "low"
            if st: e["gloss_raw"] = st
            if len(parts) == 3 and all(parts):
                e["gloss_nl"], e["gloss_en"], e["gloss_id"] = parts
        nl = e.get("gloss_nl") or st
        first = re.split(r"[:,]", nl, maxsplit=1)[0].strip().lower()
        for k, v in POS.items():
            if first.startswith(k) or nl.lower().startswith(k):
                e["pos"] = v; break
        if not st: conf = "low"
        e["confidence"] = conf
        n_steltenpool[conf] += 1
        entries.append(e)

doc = {
    "language": {"name": "Ekari", "glottocode": GLOTTO, "iso": "ekg"},
    "sources": {
        "tng": {
            "citation": "Greenhill, Simon J. (2015): TransNewGuinea.org: An Online Database of New Guinea Languages. PLoS ONE 10.10: e0141563. Lexibank CLDF release (lexibank/transnewguineaorg).",
            "url": "https://github.com/lexibank/transnewguineaorg",
            "licence": "CC BY 4.0",
            "originalSources": srcs_used,
        },
        "steltenpool1969": {
            "citation": "Steltenpool, J. (1969). Ekagi-Dutch-English-Indonesian Dictionary. Verhandelingen van het Koninklijk Instituut voor Taal-, Land- en Volkenkunde 56. The Hague: Martinus Nijhoff.",
            "url": "https://library.oapen.org/handle/20.500.12657/32178",
            "licence": "CC BY-NC 3.0",
            "note": "non-commercial: keep out of anything paid",
            "pageNote": "page is the printed page number of the book",
        },
    },
    "entries": entries,
}
json.dump(doc, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("tng", n_tng, "steltenpool", n_steltenpool)
