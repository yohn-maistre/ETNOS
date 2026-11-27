#!/usr/bin/env python3
"""Build the list of peoples (suku) of Tanah Papua from Wikipedia bahasa Indonesia's list page.

Source: "Daftar suku bangsa di Papua" (https://id.wikipedia.org/wiki/Daftar_suku_bangsa_di_Papua), the sections
for the six provinces of Tanah Papua. The Papua Nugini section is left out. Only facts are taken: each name that
the list links as "Suku ...", the province section and the regency row it is listed under, the article it links
to and whether that article exists. No article text is copied (Wikipedia text is CC BY-SA 4.0).

Two steps, so the build itself is deterministic and runs without network:

    python3 -I scripts/suku/build-suku.py fetch /tmp/etnos-src/suku
    python3 -I scripts/suku/build-suku.py build /tmp/etnos-src/suku seed/suku/tanah-papua-suku.json

`fetch` saves the list as wikitext (action=raw) and as rendered HTML (action=render, which marks links to
missing articles), the latest revision id from the page history, and, for each linked article that exists, its
wikitext's first line, to see whether it redirects. It uses index.php only, one request per second, because the
API answered "too many requests" from shared addresses on 27 November 2026.

`build` writes the seed, one entry per "Suku ..." title that the list links. Two titles that redirect to the same
article stay two entries, because a redirect is an editing choice on Wikipedia and the list names them apart; each
one links to the article that its link lands on. A link that redirects to an article that is not about a people
("Suku Mapia" goes to "Kerajaan Mapia") counts as no article. A people's language is linked only where the
catalogue (Glottolog names) has exactly one language whose name equals the people's name or a name that the list
gives for the same link ("Namblong/Nimboran").
"""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGE = 'Daftar suku bangsa di Papua'
BASE = 'https://id.wikipedia.org'
UA = 'etnos-seed-builder/1.0 (https://github.com/yohn-maistre/etnos)'
PROVINCES = {
    'Provinsi Papua Barat': 'papua-barat',
    'Provinsi Papua Barat Daya': 'papua-barat-daya',
    'Provinsi Papua': 'papua',
    'Provinsi Papua Pegunungan': 'papua-pegunungan',
    'Provinsi Papua Selatan': 'papua-selatan',
    'Provinsi Papua Tengah': 'papua-tengah',
}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8')


def index_url(title, **params):
    return BASE + '/w/index.php?' + urllib.parse.urlencode({'title': title.replace(' ', '_'), **params})


def article_url(title):
    return BASE + '/wiki/' + urllib.parse.quote(title.replace(' ', '_'), safe='()\'')


def links(rendered):
    """Titles of "Suku ..." links in the Tanah Papua part of the rendered list: (existing, missing)."""
    cut = rendered.find('id="Papua_Nugini"')
    part = rendered[:cut] if cut > 0 else rendered
    blue, red = set(), set()
    for m in re.finditer(r'<a rel="mw:WikiLink" href="[^"]*" title="([^"]*)"([^>]*)>', part):
        title = html.unescape(m.group(1)).replace(' (halaman belum tersedia)', '')
        if title.startswith('Suku '):
            (red if 'class="new"' in m.group(2) else blue).add(title)
    return blue, red


def fetch(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'daftar.wiki').write_text(get(index_url(PAGE, action='raw')), encoding='utf-8')
    time.sleep(1)
    rendered = get(index_url(PAGE, action='render'))
    (out / 'daftar.html').write_text(rendered, encoding='utf-8')
    time.sleep(1)
    hist = get(index_url(PAGE, action='history', limit='1'))
    rev = re.search(r'oldid=(\d+)', hist).group(1)
    (out / 'revision.txt').write_text(rev + '\n', encoding='utf-8')
    blue, _ = links(rendered)
    redirects = {}
    for title in sorted(blue):
        time.sleep(1)
        first = get(index_url(title, action='raw')).lstrip().split('\n', 1)[0]
        m = re.match(r'#(?:REDIRECT|ALIH)\s*\[\[([^\]|#]+)', first, re.I)
        redirects[title] = m.group(1).strip().replace('_', ' ') if m else None
    (out / 'redirects.json').write_text(json.dumps(redirects, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'revision {rev}, {len(blue)} existing articles checked')


def slug(text):
    t = text.lower().replace('–', '-')
    t = re.sub(r'[^a-z0-9]+', '-', t)
    return t.strip('-')


def plain(label):
    """A list label without markup: "Sentani/Bhuyaka (Ralibhu{{·}}Nolobhu)" -> "Sentani/Bhuyaka (Ralibhu, Nolobhu)"."""
    label = re.sub(r'\{\{[·•]\}\}', ', ', label)
    return re.sub(r'\s+', ' ', label).strip()


def build(src, dest):
    src, dest = Path(src), Path(dest)
    wiki = (src / 'daftar.wiki').read_text(encoding='utf-8')
    rendered = (src / 'daftar.html').read_text(encoding='utf-8')
    revision = (src / 'revision.txt').read_text(encoding='utf-8').strip()
    redirects = json.loads((src / 'redirects.json').read_text(encoding='utf-8'))
    blue, red = links(rendered)
    catalogue = json.loads((ROOT / 'src/catalogues/tanah-papua.json').read_text(encoding='utf-8'))
    knowledge = json.loads((ROOT / 'src/catalogues/tanah-papua-knowledge-seed.json').read_text(encoding='utf-8'))
    existing = {e['slug'] for e in knowledge['entities']}
    places = {e['title']: e['slug'] for e in catalogue['entries'] if e['kind'] == 'place'}
    by_name = {}
    for e in catalogue['entries']:
        if e['kind'] != 'language':
            continue
        code = next((a[11:] for a in e.get('aliases', []) if a.startswith('glottocode:')), None)
        if code:
            by_name.setdefault(e['title'].lower(), []).append({'glottocode': code, 'slug': e['slug'], 'title': e['title']})

    people = {}
    province = None
    regency = None
    for line in wiki.split('\n'):
        h = re.match(r'^==\s*(.+?)\s*==\s*$', line)
        if h:
            province = PROVINCES.get(h.group(1).strip())
            regency = None
            continue
        if not province:
            continue
        head = re.match(r'^!(?:width=\d+px\|)?\[\[([^\]|]+)', line)
        if head:
            name = head.group(1).strip()
            regency = places.get(name) or places.get(re.sub(r'^Kabupaten ', '', name))
            continue
        if not line.lstrip().startswith('*') and not line.lstrip().startswith('|class'):
            continue
        for m in re.finditer(r'\[\[(Suku [^\]|]+)(?:\|([^\]]+))?\]\]', line):
            target, label = m.group(1).strip(), plain(m.group(2) or m.group(1))
            if target not in blue and target not in red:
                continue
            # A parenthesis that names a regency of the catalogue ("Irarutu (Kaimana)") places the name there.
            where = regency
            par = re.search(r'\(([^)]+)\)\s*$', label)
            if not where and par and places.get(par.group(1).strip()):
                where = places[par.group(1).strip()]
            p = people.setdefault(target, {'listed': [], 'provinces': [], 'regencies': []})
            if label not in p['listed']:
                p['listed'].append(label)
            if province not in p['provinces']:
                p['provinces'].append(province)
            if where and where not in p['regencies']:
                p['regencies'].append(where)

    out = []
    for title in sorted(people, key=lambda t: t.lower()):
        p = people[title]
        name = title[5:] if title.startswith('Suku ') else title
        # Other names that the list gives for this link: each label without its parenthesis, split at "/".
        names = []
        for label in p['listed']:
            base = re.sub(r'\s*\([^)]*\)\s*$', '', label).strip()
            for part in base.split('/'):
                part = part.strip()
                if part and part.lower() != name.lower() and part not in names:
                    names.append(part)
        article = None
        if title in blue:
            lands = redirects.get(title) or title
            if lands.startswith(('Suku ', 'Orang ')):
                article = {'title': lands, 'url': article_url(lands)}
        matches = {m['glottocode']: m for n in [name, *names] for m in by_name.get(n.lower(), [])}
        language = next(iter(matches.values())) if len(matches) == 1 else None
        s = slug(title)
        out.append({
            'slug': s,
            'title': title,
            'names': names,
            'listed': p['listed'],
            'provinces': p['provinces'],
            'regencies': p['regencies'],
            'wikipedia': article,
            'language': language,
            'existing': s in existing,
        })

    seed = {
        'title': 'Suku-suku di Tanah Papua',
        'about': 'Names of the peoples of Tanah Papua as listed on Wikipedia bahasa Indonesia, built by scripts/suku/build-suku.py. Only names, links and the province or regency that the list gives were taken; no article text was copied.',
        'built': '2026-11-27',
        'source': {
            'title': PAGE,
            'url': article_url(PAGE),
            'revision': revision,
            'revisionUrl': BASE + '/w/index.php?oldid=' + revision,
            'publisher': 'Wikipedia bahasa Indonesia',
            'licence': 'CC BY-SA 4.0',
            'sections': list(PROVINCES),
        },
        'format': 'peoples[].title is the title that the list links. wikipedia is the article that the link lands on (after a redirect), or null when the article does not exist yet or the link lands on an article that is not about a people. names are other names that the list gives for the same link. listed are the labels as the list shows them. provinces and regencies are catalogue slugs of the section and the regency row the name is listed under. language is set only when exactly one catalogue language has the same name. existing marks the peoples that were already in the knowledge seed.',
        'peoples': out,
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(seed, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    new = sum(1 for p in out if not p['existing'])
    print(f"{len(out)} peoples ({new} new, {len(out) - new} already in the seed), {sum(1 for p in out if p['wikipedia'])} with an article, {sum(1 for p in out if p['language'])} with a language -> {dest}")


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'fetch':
        fetch(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == 'build':
        build(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
