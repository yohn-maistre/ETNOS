#!/usr/bin/env python3
"""Check every quote in a seed/wiki/<region>.json file against the live source text.

Wikipedia sources are read through the plain-text extract API. Other sources are
fetched as HTML and stripped. A quote passes when its folded text is a contiguous
span of the folded source. Writes <file>.verify.json beside the input and prints a
summary. Usage: verify-wiki-seed.py seed/wiki/saireri.json [--prune]
With --prune, quotes that failed are removed and sources left with no quote are dropped.
"""
import html, json, re, sys, time, unicodedata, urllib.parse, urllib.request

AGENT = 'strata-wiki-seed-verifier/0.1 (quote verification; low volume)'

# Hosts found serving injected spam during the survey.
BLOCKED = ['kepyapenkab.go.id']

def fold(text):
    text = unicodedata.normalize('NFKC', text)
    text = re.sub(r'\[\d+\]', '', text)
    text = re.sub(r'[‘’“”"`]', "'", text)
    text = re.sub(r'\s*[‐-―-]\s*', '-', text)
    return re.sub(r'\s+', ' ', text).strip().lower()

def get(url, tries=6):
    wait = 45
    for attempt in range(tries):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read().decode('utf-8', 'replace')
        except Exception as error:
            last = str(error)
            if '429' not in last and attempt >= 1:
                break
            time.sleep(wait)
            wait *= 2
    raise RuntimeError(last[:80])

def source_text(url):
    if 'wikipedia.org/w/api.php' in url:
        pages = json.loads(get(url))['query']['pages']
        return ' '.join(page.get('extract', '') for page in pages.values())
    wiki = re.match(r'https://(\w+)\.wikipedia\.org/wiki/([^#?]+)', url)
    if wiki:
        api = (f'https://{wiki.group(1)}.wikipedia.org/w/api.php?action=query&prop=extracts'
               f'&explaintext=1&format=json&redirects=1&titles={wiki.group(2)}')
        pages = json.loads(get(api))['query']['pages']
        return ' '.join(page.get('extract', '') for page in pages.values())
    page = get(url)
    if page.lstrip().startswith('%PDF'):
        raise RuntimeError('PDF: text not extracted')
    page = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', page)
    return html.unescape(re.sub(r'(?s)<[^>]+>', ' ', page))

def main():
    path = sys.argv[1]
    prune = '--prune' in sys.argv
    seed = json.load(open(path))
    report = {'file': path, 'checked': time.strftime('%Y-%m-%d'), 'sources': []}
    totals = {'ok': 0, 'bad': 0, 'unreachable': 0}
    cache = {}
    for page in seed['pages']:
        for source in page['sources']:
            url = source.get('fetchedVia') or source['url']
            if any(host in url for host in BLOCKED):
                source['verified'] = False
                report['sources'].append({'page': page['slug'], 'url': url, 'ok': 0, 'bad': [], 'error': 'blocked host'})
                continue
            entry = {'page': page['slug'], 'url': url, 'ok': 0, 'bad': [], 'error': None}
            if url not in cache:
                try:
                    cache[url] = fold(source_text(url))
                except Exception as error:
                    cache[url] = error
                time.sleep(8)
            text = cache[url]
            if isinstance(text, Exception):
                entry['error'] = str(text)
                totals['unreachable'] += len(source['quotes'])
                source['verified'] = False
            else:
                kept = []
                for quote in source['quotes']:
                    if fold(quote['text']).rstrip('.') in text:
                        entry['ok'] += 1
                        kept.append(quote)
                    else:
                        entry['bad'].append(quote['text'])
                totals['ok'] += entry['ok']
                totals['bad'] += len(entry['bad'])
                source['verified'] = True
                if prune:
                    source['quotes'] = kept
            report['sources'].append(entry)
        if prune:
            page['sources'] = [s for s in page['sources'] if s.get('verified') and s['quotes']]
    report['totals'] = totals
    json.dump(report, open(path.replace('.json', '.verify.json'), 'w'), indent=1, ensure_ascii=False)
    if prune:
        json.dump(seed, open(path, 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(totals))
    for entry in report['sources']:
        if entry['error'] or entry['bad']:
            print(entry['page'], entry['url'], entry['error'] or f"{len(entry['bad'])} bad")

main()
