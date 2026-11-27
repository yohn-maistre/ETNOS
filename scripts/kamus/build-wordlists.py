#!/usr/bin/env python3
"""Build the basic wordlists of Tanah Papua languages for Peta Kata and the Kamus seeds.

Reads four Lexibank CLDF datasets and writes seed/kamus/tanah-papua-wordlists.json. Three are CC BY 4.0
(TransNewGuinea.org, ABVD, Berry & Berry 1987). Papuan Voices is CC BY-NC 4.0: its forms are marked
non-commercial through their dataset, are capped on their own so the CC BY forms stay as they were, and must
stay out of anything paid (src/licence.ts). The output holds
one entry per language of the Tanah Papua catalogue (src/catalogues/tanah-papua.json, matched by Glottocode)
and per concept of a basic list of about 100 concepts. Every form keeps its dataset, the form exactly as the
dataset gives it, the value as given when it differs, the variety and the original publication.

Deterministic, no model, no network. Fetch the datasets first (see seed/kamus/README.md, "Wordlists"):

    python3 -I scripts/kamus/build-wordlists.py /tmp/etnos-src seed/kamus/tanah-papua-wordlists.json

where /tmp/etnos-src holds tng/, abvd/, berrywestpapuan/ and papuanvoices/, each with the CLDF files languages.csv,
parameters.csv, forms.csv and sources.bib (abvd also contributions.csv).

Licences of datasets that were checked and left out are listed in docs/research/peta-kata-sources-2026-11-27.md.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

DATASETS = {
    'tng': {
        'dir': 'tng',
        'name': 'TransNewGuinea.org',
        'citation': 'Greenhill, Simon J. (2015): TransNewGuinea.org: An Online Database of New Guinea Languages. PLoS ONE 10.10: e0141563. Lexibank CLDF release (lexibank/transnewguineaorg).',
        'url': 'https://github.com/lexibank/transnewguineaorg',
        'licence': 'CC BY 4.0',
    },
    'abvd': {
        'dir': 'abvd',
        'name': 'Austronesian Basic Vocabulary Database',
        'citation': 'Greenhill, S.J., Blust, R. & Gray, R.D. (2008). The Austronesian Basic Vocabulary Database: From Bioinformatics to Lexomics. Evolutionary Bioinformatics 4: 271-283. Lexibank CLDF release (lexibank/abvd).',
        'url': 'https://github.com/lexibank/abvd',
        'licence': 'CC BY 4.0',
    },
    'berry1987': {
        'dir': 'berrywestpapuan',
        'name': 'Berry & Berry 1987',
        'citation': 'Berry, Christine and Berry, Keith (1987): A survey of some West Papuan Phylum languages. Workpapers in Indonesian Languages and Cultures 4: 25-80. Lexibank CLDF release (lexibank/berrywestpapuan).',
        'url': 'https://github.com/lexibank/berrywestpapuan',
        'licence': 'CC BY 4.0',
    },
    'papuanvoices': {
        'dir': 'papuanvoices',
        'name': 'Papuan Voices',
        'citation': 'Sawaki, Yusuf; Lekeneny, Jeanete; Arilaha, Apriani; Kirihio, Jimmi; Tutorop, Emanuel; Wabia, Boas; Mayor, Infak; Tabuni, Simon; Karesina, Stevani; Heggarty, Paul; Dërmaku-Appelganz, Darja (2020). Papuan Voices. https://papuanvoices.clld.org. Lexibank CLDF release (lexibank/papuanvoices).',
        'url': 'https://github.com/lexibank/papuanvoices',
        'licence': 'CC BY-NC 4.0',
        'nonCommercial': True,
    },
}

# The basic list: Concepticon ID, Indonesian label, English label. Concepts of the Leipzig-Jakarta list take its
# Indonesian prompt (seed/kamus/leipzig-jakarta-100.json); the other Indonesian labels were written for ETNOS on
# 27 November 2026. Chosen as the concepts that these datasets record for the most Tanah Papua languages,
# plus a few that matter on the island (babi, kasuari, sagu, sungai). Order is the order of the picker.
CONCEPTS = [
    (948, 'air', 'water'), (221, 'api', 'fire'), (1252, 'rumah', 'house'), (1337, 'babi', 'pig'),
    (857, 'batu', 'stone'), (1343, 'matahari', 'sun'), (1313, 'bulan', 'moon'), (1430, 'bintang', 'star'),
    (2108, 'hujan', 'rain'), (1489, 'awan', 'cloud'), (960, 'angin', 'wind'), (1732, 'langit', 'sky'),
    (639, 'gunung', 'mountain'), (666, 'sungai', 'river'), (2159, 'tanah', 'ground'), (671, 'pasir', 'sand'),
    (778, 'asap', 'smoke'), (646, 'abu', 'ash'), (1233, 'malam', 'night'),
    (906, 'pohon', 'tree'), (628, 'daun', 'leaf'), (670, 'akar', 'root'), (1507, 'buah', 'fruit'),
    (868, 'pisang', 'banana'), (2270, 'sagu', 'sago'),     (937, 'burung', 'bird'), (744, 'telur', 'egg'), (1257, 'sayap', 'wing'), (1220, 'ekor', 'tail'),
    (466, 'kasuari', 'cassowary'), (2009, 'anjing', 'dog'), (730, 'ular', 'snake'),     (1857, 'buaya', 'crocodile'), (1392, 'kutu rambut', 'louse'), (1509, 'nyamuk', 'mosquito'),
        (1256, 'kepala', 'head'), (189, 'rambut', 'hair'), (1248, 'mata', 'eye'), (1221, 'hidung', 'nose'),
    (1247, 'telinga', 'ear'), (674, 'mulut', 'mouth'), (1380, 'gigi', 'tooth'), (1205, 'lidah', 'tongue'),
    (1333, 'leher', 'neck'), (1402, 'dada (susu)', 'breast'), (1251, 'perut', 'belly'),     (1673, 'lengan', 'arm'), (1277, 'tangan', 'hand'), (1258, 'kuku', 'fingernail'),
    (1297, 'kaki', 'leg'), (1371, 'lutut', 'knee'), (763, 'kulit', 'skin'), (1394, 'tulang', 'bone'),
    (946, 'darah', 'blood'),
    (683, 'orang', 'person'), (1554, 'laki-laki', 'man'), (962, 'perempuan', 'woman'), (1216, 'ibu', 'mother'),
    (1217, 'bapak', 'father'), (1405, 'nama', 'name'), (1209, 'saya', 'I'), (1215, 'kamu', 'you (one person)'),
    (1212, 'kami, kita', 'we'), (1235, 'siapa', 'who'), (1236, 'apa', 'what'), (1214, 'ini', 'this'), (78, 'itu', 'that'),
    (1493, 'satu', 'one'), (1498, 'dua', 'two'), (492, 'tiga', 'three'), (1500, 'empat', 'four'), (493, 'lima', 'five'),
    (98, 'semua', 'all'), (1198, 'banyak', 'many'),
    (1336, 'makan', 'eat'), (1401, 'minum', 'drink'), (1585, 'tidur', 'sleep'), (1416, 'duduk', 'sit'),
    (1442, 'berdiri', 'stand'), (1443, 'berjalan', 'walk'), (1446, 'datang', 'come'), (1441, 'terbang', 'fly'),
    (1409, 'melihat', 'see'), (1408, 'mendengar', 'hear'), (1447, 'memberi', 'give'),
    (1403, 'menggigit', 'bite'), (1839, 'menangis', 'cry'), (1494, 'mati', 'die'), (1417, 'membunuh', 'kill'),
        (1035, 'baik', 'good'), (1202, 'besar', 'big'), (1246, 'kecil', 'small'), (1203, 'panjang', 'long'),
    (1210, 'berat', 'heavy'), (1231, 'baru', 'new'), (1287, 'dingin', 'cold'),     (1406, 'jauh', 'far'),
    (1335, 'putih', 'white'), (156, 'merah', 'red'), (1424, 'kuning', 'yellow'),
    ]
MAX_FORMS = 3
CLEAN = re.compile(r'^[\wÀ-ɏɐ-˿ᴀ-ᶿḀ-ỿ\'’ʼ:\-.~ ()=/,]+$')


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def bib(path):
    """A short citation per BibTeX key: authors, year, title."""
    out = {}
    if not path.exists():
        return out
    text = path.read_text(encoding='utf-8')
    for m in re.finditer(r'@\w+\{([^,]+),(.*?)\n\}', text, re.S):
        key, body = m.group(1).strip(), m.group(2)
        fields = {k.lower(): v.strip() for k, v in re.findall(r'(\w+)\s*=\s*\{(.*?)\},?\s*$', body, re.M)}
        author = fields.get('author', '').replace(' and ', '; ')
        parts = [p for p in [author, f"({fields['year']})" if fields.get('year') else '', fields.get('title', '')] if p]
        out[key] = re.sub(r'[{}\\]', '', ' '.join(parts)).strip()
    return out


def main(src, dest):
    src, dest = Path(src), Path(dest)
    catalogue = json.loads((ROOT / 'src/catalogues/tanah-papua.json').read_text(encoding='utf-8'))
    lj = json.loads((ROOT / 'seed/kamus/leipzig-jakarta-100.json').read_text(encoding='utf-8'))
    lj_by_id = {c['concepticon']: c for c in lj['concepts']}
    languages = {}
    for e in catalogue['entries']:
        if e['kind'] != 'language':
            continue
        code = next((a[11:] for a in e.get('aliases', []) if a.startswith('glottocode:')), None)
        if code:
            languages[code] = {'slug': e['slug'], 'name': e['title']}

    concepts = []
    index = {}
    for i, (cid, label, english) in enumerate(CONCEPTS):
        ljc = lj_by_id.get(cid)
        concepts.append({
            'key': slug(label),
            'concepticon': cid,
            'id': ljc['id'] if ljc else label,
            'english': english,
            'leipzigJakarta': ljc['n'] if ljc else None,
        })
        index[cid] = i
    assert len({c['key'] for c in concepts}) == len(concepts), 'concept keys must be unique'

    forms = defaultdict(lambda: defaultdict(list))  # glottocode -> concept index -> [form rows]
    originals = {}
    for key, meta in DATASETS.items():
        d = src / meta['dir']
        refs = bib(d / 'sources.bib')
        langs = {l['ID']: l for l in read(d / 'languages.csv') if l['Glottocode'] in languages}
        params = {p['ID']: p for p in read(d / 'parameters.csv')}
        contrib = {}
        if (d / 'contributions.csv').exists():
            for c in read(d / 'contributions.csv'):
                contrib[c['Language_ID']] = c.get('Source_Comment', '').strip()
        for f in read(d / 'forms.csv'):
            lang = langs.get(f['Language_ID'])
            if not lang:
                continue
            p = params.get(f['Parameter_ID'])
            cid = int(p['Concepticon_ID']) if p and p.get('Concepticon_ID') else None
            if cid not in index:
                continue
            if f.get('Loan', '').lower() == 'true':
                continue
            form = (f.get('Form') or '').strip()
            if not form or not CLEAN.match(form):
                continue
            src_keys = [s.split('[')[0] for s in (f.get('Source') or '').split(';') if s.strip()]
            ref = ''
            if src_keys and src_keys[0] in refs:
                ref = refs[src_keys[0]]
                originals[src_keys[0]] = ref
            elif key == 'abvd' and contrib.get(f['Language_ID']):
                ref = contrib[f['Language_ID']]
            variety = lang['Name'] if lang['Name'] != lang.get('Glottolog_Name') else ''
            value = (f.get('Value') or '').strip()
            forms[lang['Glottocode']][index[cid]].append({
                'form': form,
                'value': value if value and value != form else '',
                'dataset': key,
                'ref': ref,
                'variety': variety,
                'dataId': f['ID'],
                'param': p['Name'],
            })

    order = list(DATASETS)
    # Repeated strings sit in tables and forms point at them by position, which keeps the file small enough
    # to ship inside the Worker. A form is [concept, form, dataset, original reference, variety, dataset
    # concept name, dataset row id, value as given]; the last item is left out when the value equals the form.
    tables = {'refs': [], 'varieties': [], 'params': []}
    where = {k: {} for k in tables}

    def at(table, text):
        if text not in where[table]:
            where[table][text] = len(tables[table])
            tables[table].append(text)
        return where[table][text]

    out_langs = {}
    total = 0
    for code in sorted(forms):
        entries = []
        for ci in sorted(forms[code]):
            rows = forms[code][ci]
            # The main variety first (the one named as in Glottolog), then by dataset order; one row per spelling.
            rows.sort(key=lambda r: (r['variety'] != '', order.index(r['dataset'])))
            # Non-commercial datasets are capped on their own, after the open ones, so adding one never pushes
            # an open form out of the list.
            for nc in (False, True):
                seen = set()
                for r in rows:
                    if bool(DATASETS[r['dataset']].get('nonCommercial')) != nc:
                        continue
                    k = r['form'].lower()
                    if k in seen:
                        continue
                    seen.add(k)
                    entry = [ci, r['form'], order.index(r['dataset']), at('refs', r['ref']), at('varieties', r['variety']), at('params', r['param']), r['dataId']]
                    if r['value']:
                        entry.append(r['value'])
                    entries.append(entry)
                    if len(seen) >= MAX_FORMS:
                        break
        total += len(entries)
        out_langs[code] = {**languages[code], 'forms': entries}

    out = {
        'title': 'Daftar kata dasar bahasa-bahasa Tanah Papua',
        'about': 'Basic wordlists of Tanah Papua languages from published datasets, built by scripts/kamus/build-wordlists.py. Three datasets are CC BY 4.0; Papuan Voices is CC BY-NC 4.0 and its forms must stay out of anything paid. Words are as published and have not been checked by speakers.',
        'built': '2026-11-27',
        'note': 'Indonesian concept labels come from the Leipzig-Jakarta list prompts where the concept is on that list; the others were written for ETNOS on 27 November 2026. Forms are copied as the datasets give them.',
        'format': 'languages[glottocode].forms holds [concept index, form, dataset index, refs index, varieties index, params index, dataset row id, value as given (only when it differs from the form)]. Empty strings in refs and varieties mean none.',
        'datasets': [{'key': k, **{kk: v for kk, v in m.items() if kk != 'dir'}} for k, m in DATASETS.items()],
        'concepts': concepts,
        **tables,
        'languages': out_langs,
    }
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    covered = sum(1 for c in out_langs.values() if c['forms'])
    print(f'{covered} languages, {len(concepts)} concepts, {total} forms -> {dest}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
