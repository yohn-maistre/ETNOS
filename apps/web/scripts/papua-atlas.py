"""Rebuild src/papua-atlas.json: seven customary reference regions and 256 Glottolog language points.

Usage: python3 scripts/papua-atlas.py path/to/languages.csv
Needs shapely. languages.csv is Glottolog CLDF 5.4 (CC BY 4.0):
https://raw.githubusercontent.com/glottolog/glottolog-cldf/v5.4/cldf/languages.csv
Region outlines are the union of the regency outlines in src/site-map.json, grouped by the region
membership in src/catalogues/tanah-papua.json. See licenses/glottolog-data.txt.
"""
import csv, json, math, re, sys
from pathlib import Path
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

web = Path(__file__).resolve().parent.parent
catalogue = json.loads((web.parent.parent / 'src/catalogues/tanah-papua.json').read_text())
site = json.loads((web / 'src/site-map.json').read_text())
geo = {r['Glottocode']: r for r in csv.DictReader(open(sys.argv[1], encoding='utf-8'))}

# Regencies that sources place in different regions. From docs/research/customary-regions-and-boundaries-2026-11-17.md,
# section 4, until the claims table (task 27) holds them. The map hatches these and never picks one silently.
CONTESTED = {
    'nabire': ['meepago', 'saireri'],
    'mimika': ['meepago', 'bomberai', 'ha-anim'],
    'puncak-jaya': ['la-pago', 'meepago'],
    'puncak': ['la-pago', 'meepago'],
    'mamberamo-raya': ['mamta-tabi', 'saireri'],
    'teluk-wondama': ['domberai', 'saireri'],
}

regions = {e['slug'] for e in catalogue['entries'] if e.get('facet') == 'customary-region'}
member = {e['slug']: next(p for p in e['parents'] if p in regions) for e in catalogue['entries']
          if e.get('facet') in ('regency', 'city') and any(p in regions for p in e['parents'])}

def rings(d):
    for sub in re.split(r'(?=M)', d):
        pts = [tuple(map(float, xy.split())) for xy in re.findall(r'[-\d.]+ [-\d.]+', sub)]
        if len(pts) >= 3: yield pts

shapes = {p['slug']: [Polygon(r).buffer(0) for r in rings(p['d'])] for p in site['places']}
groups = {}
for slug, polys in shapes.items():
    groups.setdefault(member[slug], []).extend(polys)

out_regions, xs, ys = {}, [], []
for region, polys in groups.items():
    u = unary_union([g.buffer(1.2) for g in polys]).buffer(-1.2).simplify(0.6)
    parts = [g for g in getattr(u, 'geoms', [u]) if g.area >= 4]
    d = ''
    for g in parts:
        coords = list(g.exterior.coords)[:-1]
        xs += [x for x, _ in coords]; ys += [y for _, y in coords]
        d += 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in coords) + 'Z'
    label = max(parts, key=lambda g: g.area).representative_point()
    out_regions[region] = {'d': d, 'x': round(label.x, 1), 'y': round(label.y, 1)}

scale = site['width'] / (site['east'] - site['west'])
merc = lambda lat: math.log(math.tan(math.pi / 4 + lat * math.pi / 360))
langs = []
for e in catalogue['entries']:
    if e['kind'] != 'language': continue
    code = next(a.split(':', 1)[1] for a in e['aliases'] if a.startswith('glottocode:'))
    row = geo[code]
    x = (float(row['Longitude']) - site['west']) * scale
    y = scale * 180 / math.pi * (merc(site['north']) - merc(float(row['Latitude'])))
    inside = [s for s, polys in shapes.items() if sum(g.contains(Point(x, y)) for g in polys) % 2]
    if inside: regency = inside[0]
    else:
        dist, regency = min((min((px - x) ** 2 + (py - y) ** 2 for r in rings(p['d']) for px, py in r), p['slug']) for p in site['places'])
        if dist > 20 ** 2: raise SystemExit(f'{e["slug"]} is more than 20 px from any regency')
    langs.append([e['slug'], round(x, 1), round(y, 1), member[regency]])

pad = 12
atlas = {
    'box': [round(min(xs) - pad), round(min(ys) - pad), round(max(xs) - min(xs) + 2 * pad), round(max(ys) - min(ys) + 2 * pad)],
    'sources': ['Garis wilayah: gabungan garis kabupaten Badan Informasi Geospasial (disederhanakan) menurut keanggotaan wilayah acuan RPJMN 2020–2024.', 'Titik bahasa: Glottolog 5.4, CC BY 4.0.'],
    'regions': out_regions,
    'contested': [{'slug': slug, 'regions': regs, 'd': next(p['d'] for p in site['places'] if p['slug'] == slug)} for slug, regs in CONTESTED.items()],
    'langs': langs,
}
(web / 'src/papua-atlas.json').write_text(json.dumps(atlas, separators=(',', ':'), ensure_ascii=False))
print(len(out_regions), 'regions,', len(langs), 'languages')
