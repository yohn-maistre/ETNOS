import test from 'node:test'
import assert from 'node:assert/strict'
import { contextRedirect, entryTab, tabHref, isEntrySegment, isPageId } from '../src/entry-routes.ts'
import { viewerList, viewerListHref, type ViewerObject } from '../src/viewer-data.ts'

test('old context addresses open the same entry under /wiki with the matching tab', () => {
  assert.equal(contextRedirect('/contexts/paniai', ''), '/wiki/paniai')
  assert.equal(contextRedirect('/contexts/paniai/', '?tab=sumber'), '/wiki/paniai?tab=riset')
  assert.equal(contextRedirect('/contexts/paniai', '?tab=data'), '/wiki/paniai?tab=riset')
  assert.equal(contextRedirect('/contexts/paniai', '?tab=perkembangan'), '/wiki/paniai?tab=riwayat')
  assert.equal(contextRedirect('/contexts/paniai/lapisan', ''), '/wiki/paniai?tab=riwayat')
  // Communities moved to the rail, so that tab opens Tentang; other query parts stay.
  assert.equal(contextRedirect('/contexts/bahasa-ekari', '?tab=komunitas&q=x'), '/wiki/bahasa-ekari?q=x')
  assert.equal(contextRedirect('/contexts/paniai', '?tab=tidak-dikenal'), '/wiki/paniai')
  // Creating a context still happens on the old route; anything else is not a context address.
  assert.equal(contextRedirect('/contexts/paniai', '?create=1'), null)
  assert.equal(contextRedirect('/contexts', ''), null)
  assert.equal(contextRedirect('/wiki/paniai', ''), null)
  assert.equal(contextRedirect('/contexts/paniai/lain', ''), null)
})

test('entry tabs read from the address and write back to it', () => {
  assert.equal(entryTab(''), 'tentang')
  assert.equal(entryTab('?tab=riset'), 'riset')
  assert.equal(entryTab('?tab=sumber'), 'riset')
  assert.equal(entryTab('?tab=komunitas'), 'tentang')
  assert.equal(entryTab('?tab=apa'), 'tentang')
  assert.equal(tabHref('paniai', 'tentang', '?tab=riset'), '/wiki/paniai')
  assert.equal(tabHref('paniai', 'riwayat', '?x=1'), '/wiki/paniai?x=1&tab=riwayat')
  assert.equal(tabHref('danau uji', 'percakapan'), '/wiki/danau%20uji?tab=percakapan')
})

test('reserved segments under /wiki are routes, and page ids are recognised', () => {
  for (const s of ['notes', 'data', 'peta', 'peta-kata', 'lihat', 'jenis']) assert.equal(isEntrySegment(s), false, s)
  assert.equal(isEntrySegment(undefined), false)
  assert.equal(isEntrySegment('paniai'), true)
  assert.equal(isPageId('0b3c1f0e-1d2a-4c1b-9a6b-2a8d3e4f5a6b'), true)
  assert.equal(isPageId('paniai'), false)
})

test('the viewer list follows the list the reader came from', () => {
  const rec = (id: string, kind: ViewerObject['kind'], title: string): ViewerObject => ({ id, kind, title, summary: '', sources: [], checked: '' })
  const all = [rec('a', 'audio', 'Suara uji'), rec('m', 'model', 'Kapak uji'), rec('s', 'species', 'Burung uji'), rec('l', 'landform', 'Danau uji')]
  assert.deepEqual(viewerList('', all).map((o) => o.id), ['m', 's', 'l', 'a'])
  assert.deepEqual(viewerList('semua', all).map((o) => o.id), ['m', 's', 'l', 'a'])
  assert.deepEqual(viewerList('jenis-makhluk', all).map((o) => o.id), ['s', 'a'])
  assert.deepEqual(viewerList('jenis-bentang-alam', all).map((o) => o.id), ['l'])
  assert.deepEqual(viewerList('cari-uji', all).length, 4)
  assert.deepEqual(viewerList('cari-danau', all).map((o) => o.id), ['l'])
  assert.deepEqual(viewerList('pilih-l.m.tidak-ada', all).map((o) => o.id), ['l', 'm'])
  assert.deepEqual(viewerList('entri-danau-uji', all, ['l', 's']).map((o) => o.id), ['l', 's'])
  assert.deepEqual(viewerList('entri-danau-uji', all).map((o) => o.id), [])
  assert.equal(viewerListHref('l', 'jenis-makhluk'), '/wiki/lihat/l?daftar=jenis-makhluk')
  assert.equal(viewerListHref('l', 'semua'), '/wiki/lihat/l')
  assert.equal(viewerListHref('l', ''), '/wiki/lihat/l')
})
