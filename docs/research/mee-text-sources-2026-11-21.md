# Mee text for testing the Kamus, and what it says about word highlights

21 November 2026. The owner asked for real Mee (Ekari, `ekar1243`) writing to seed a demo community and test the Kamus. Found with a web search; nothing here is copied into the repository.

## Sources with running Mee text

| Source | What it is | Use |
| --- | --- | --- |
| [Uwata Tanida Danaa Miyogada Kamoro Bage](https://sastranusantara.difalitera.org/2020/11/19/uwata-tanida-danaa-miyogada-kamoro-bage/), Manfred Kudiai, Difalitera 2020 | A short story written and narrated in Mee, with the author's own Indonesian version on the same page (about 1,500 words each) | Best parallel text found. Copyright held by the author; short quotes with a link, or ask him |
| [Pendidikan Yulianus dari Woge](https://majalahkribo.com/pendidikan-yulianus-dari-woge-di-balik-gunung-memori-hidup-yang-berharap-simpati/), Marselino Wegobi Pigai, Majalah Kribo 2024 | Indonesian essay with a real Mee back-and-forth, each line translated | Short dialogue lines, good for the "back and forth" test |
| [Cerita dongeng adik dan kakak](http://wisatadeiyai.blogspot.com/2016/06/cerita-dongen-adik-dan-kaka-kaka-laki.html), Ferdinan Pekey, Wisata Deiyai 2016 | A Mee folktale (Yimiyo) in Mee with an Indonesian retelling | Folktale register |
| [Sedikit perkenalan dengan bahasa Mee](https://sastrapapua.org/2015/10/08/sedikit-perkenalan-dengan-bahasa-mee-dari-tanah-papua/), Veronika Kusumaryati and Hengky Yeimo, Komunitas Sastra Papua 2015 | Grammar notes with glossed example sentences (pronouns, ki/ko, SOV order, -ida, -iga, possessive -ya) | Ground truth for the suffix rules below |
| [Koya Maria](http://mshkatolikpapua.blogspot.com/2013/01/salam-maria-dalam-bahasa-mee.html), FKMKP DIY 2013 | The Hail Mary in Mee | Church register |
| [Daftar 111 kata bahasa Mee](http://meetotamana.blogspot.com/2016/01/daftar-111-kata-bahasa-mee-paniai-mee_28.html), 2016 | Modern spelling word list with Indonesian | Check modern spellings against Steltenpool 1969 |
| Shiohara and Nawipa 2011, *Mee texts: three stories about pandanus gardens* ([doi:10.15026/94179](https://doi.org/10.15026/94179)) | Glossed texts by a linguist with a Mee co-author | Academic, check the licence of the repository copy |

**Someone is already building a Mee dictionary.** [Kamus Mee](https://kamus.mee-mana.online/) is live, written in Mee, and [Nadi Papua reported on 5 September 2026](https://www.nadipapua.com/post-kamus-mee-siapkan-fitur-media-untuk-arsip-musik-dan-cerita-orang-mee-2222) that it is adding songs, stories and voice. ETNOS should talk to them before showing a Mee Kamus on stage: link to them, offer to exchange checked entries if they want, and never present ours as the first.

## Coverage test

A 227-word sample from the sources above, run against the Steltenpool seed (2,905 entries), in a scratch script that was not committed:

- **Exact match**: 31% of distinct words and 39% of running words are found in the seed.
- **With suffix stripping** (-ko, -ka, -ya, -ida, -iga, -make, -kodo and a few others): 44% and 52%.
- **False friends are common.** The seed's 1969 meaning is often not the one in the sentence: *tabaga* comes back as "teratai", *bego* as a kind of gecko, *ya* as wild pig (it is usually the possessive *-ya*), and stripping turns *Timika* into *timi* and *niko* into *ni*.

What this means for the design:

1. A highlight in a post must ask, not tell. Show "Artinya *besar*?" with Ya, Bukan and Tidak tahu, and the source (Steltenpool 1969) in small text. A word turns solid only after members have checked it.
2. Suffix stripping roughly doubles what we can show, but it needs its own question ("Bentuk dari *ibo*?"), and proper names (Timika, Paniai, Arafura) must be skipped. A capitalised word that is not sentence-initial is a good first rule.
3. About half of real running text will have no seed match at all. Those words are the ones the community adds. That is the point of the Kamus, and the demo should show it.

## For the demo community

Options, from best to weakest:

1. Mee speakers write real posts in a demo community with consent (the owner's network, Komunitas Sastra Papua, or the authors above). Real, current and consented.
2. Short quoted passages from the sources above, posted by a clearly labelled demo account as quotations with author and link. Indonesian copyright law allows citation with the source named for education and research (UU 28/2014 Pasal 44), but only short passages, not whole stories.
3. Local test fixtures only, never published. Fine for development now.
