import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tokenize,matchWord,stripSuffix,chooseUnderlines,align,guessClass,indonesianWords,DEFAULT_SUFFIXES,type Candidate} from '../src/kamus-text.ts'

// Test strings written for these tests. They are shaped like mixed Mee and Indonesian posts, not quoted from anywhere.
const MEE=DEFAULT_SUFFIXES.ekar1243

test('the tokenizer skips numbers, links, mentions and names that do not start a sentence',()=>{
 const t=tokenize('Owaya ibo. Kami ke Timika 12 Mei, lihat https://contoh.id/a. @budi Ugee enaa!\nAgiyo tai')
 const by=(w:string)=>t.find(x=>x.text===w)!
 assert.equal(by('Owaya').skip,undefined,'sentence-initial capital is a word')
 assert.equal(by('Timika').skip,'name');assert.equal(by('Mei').skip,'name')
 assert.equal(t.find(x=>x.text==='12')!.skip,'number')
 assert.equal(t.find(x=>x.text.startsWith('https'))!.text,'https://contoh.id/a','a trailing full stop stays with the sentence')
 assert.equal(t.find(x=>x.text==='@budi')!.skip,'mention')
 assert.equal(by('Ugee').skip,'name','after a mention the sentence has already started')
 assert.equal(by('Agiyo').skip,undefined,'a new line starts a sentence');assert.equal(by('Agiyo').initial,true)
 assert.equal(by('ibo').sentence,0);assert.equal(by('enaa').sentence,2);assert.equal(by('tai').sentence,3)
 const text='Owaya ibo.';assert.equal(text.slice(t[1].start,t[1].end),'ibo','offsets point into the text')
})

test('the matcher finds the headword, then a spelling, then a form with one suffix off',()=>{
 const known=new Set(['ibo','owa','ugee','yame','jame'])
 const has=(n:string)=>known.has(n)
 assert.deepEqual(matchWord('ibo',has,MEE),{kind:'exact',norm:'ibo'})
 assert.deepEqual(matchWord('jame',has,MEE),{kind:'exact',norm:'jame'},'a known spelling (tulisan lain) matches exactly')
 assert.deepEqual(matchWord('owaya',has,MEE),{kind:'stem',norm:'owaya',stem:'owa',suffix:'ya'})
 assert.deepEqual(matchWord('ugeekodo',has,MEE),{kind:'stem',norm:'ugeekodo',stem:'ugee',suffix:'kodo'},'longest suffix first')
 assert.equal(matchWord('niko',has,MEE),null,'a stem must keep three letters')
 assert.equal(matchWord('ya',has,MEE),null,'short words are never matched')
 assert.equal(stripSuffix('owaka',['-ka'],has)?.stem,'owa','a steward may write a suffix with its hyphen')
 assert.equal(matchWord('owaya',has,[]),null,'a language without a suffix list matches exact forms only')
})

test('underlines: one per sentence, three per post, the most frequent first',()=>{
 const t=tokenize('Ibo owa ugee. Tai agiyo. Enaa bado. Mogo kei.')
 const c=(w:string,weight:number):Candidate=>({token:t.find(x=>x.norm===w)!,key:'k:'+w,weight})
 const picked=chooseUnderlines([c('ibo',2),c('owa',9),c('ugee',1),c('tai',5),c('enaa',1),c('mogo',7)])
 assert.deepEqual(picked.map(p=>p.token.norm),['owa','tai','mogo'],'heaviest per sentence, in text order, at most three')
 assert.equal(chooseUnderlines([c('ibo',1),{...c('tai',1),key:'k:ibo'}]).length,1,'one key once per post')
})

test('Dice alignment over Artinya pairs gives a candidate only with repeated evidence',()=>{
 const pairs=[
  {local:['owa','ibo'],indonesian:indonesianWords('Rumah itu besar.')},
  {local:['owa','tai'],indonesian:indonesianWords('Rumah di kebun.')},
  {local:['ugee','tai'],indonesian:indonesianWords('Ubi di kebun.')},
  {local:['owa'],indonesian:indonesianWords('Ini rumah kami.')},
 ]
 const a=align(pairs)
 assert.deepEqual(a.find(x=>x.local==='owa'),{local:'owa',indonesian:'rumah',dice:1,together:3})
 assert.equal(a.find(x=>x.local==='tai')?.indonesian,'kebun')
 assert.ok(!a.some(x=>x.local==='ibo'),'one pair is not enough')
 assert.ok(!indonesianWords('yang di dan itu').length,'function words are not aligned')
})

test('a tiny Indonesian rule set guesses the class of the aligned word',()=>{
 assert.equal(guessClass('rumah'),'benda');assert.equal(guessClass('pekerjaan'),'benda')
 assert.equal(guessClass('makan'),'kerja');assert.equal(guessClass('menanam'),'kerja');assert.equal(guessClass('berjalan'),'kerja')
 assert.equal(guessClass('besar'),'sifat');assert.equal(guessClass('merah'),'sifat','closed lists come before affixes')
 assert.equal(guessClass('dan'),'lainnya');assert.equal(guessClass('tidak'),'lainnya')
})
