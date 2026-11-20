// Build seed/kamus/id-frequency.json: the 20,000 most frequent Indonesian word forms from the FrequencyWords
// list (OpenSubtitles 2018, content CC BY-SA 4.0, https://github.com/hermitdave/FrequencyWords).
// Usage: node scripts/kamus/build-id-frequency.mjs /path/to/id_50k.txt
// Words that are also Ekari headwords stay in: the Kamus finder decides those per sentence.
import {readFileSync,writeFileSync} from 'node:fs'
const file=process.argv[2];if(!file){console.error('usage: build-id-frequency.mjs id_50k.txt');process.exit(1)}
const words=[]
for(const line of readFileSync(file,'utf8').split('\n')){
 const w=line.split(' ')[0]?.trim();if(!w||!/^[a-z][a-z'-]*[a-z]$/.test(w))continue
 words.push(w);if(words.length===20000)break
}
writeFileSync(new URL('../../seed/kamus/id-frequency.json',import.meta.url),JSON.stringify({source:'FrequencyWords id_50k (OpenSubtitles 2018)',url:'https://github.com/hermitdave/FrequencyWords',licence:'CC BY-SA 4.0',count:words.length,words}))
console.log(words.length)
