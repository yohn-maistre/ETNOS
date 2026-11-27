# Peoples of Tanah Papua from Wikipedia's list (28 November 2026)

The Ensiklopedia kind page *Suku* (`/wiki/jenis/suku`) had 9 entries. It now lists the peoples that Wikipedia bahasa Indonesia names on its list page, as stubs that link to their source. The builder is `scripts/suku/build-suku.py`; its output is `seed/suku/tanah-papua-suku.json`; the code that reads it is `src/suku.ts`.

## Source

| Page | Revision | Licence | What was taken |
| --- | --- | --- | --- |
| [Daftar suku bangsa di Papua](https://id.wikipedia.org/wiki/Daftar_suku_bangsa_di_Papua) | [29395555](https://id.wikipedia.org/w/index.php?oldid=29395555) (28 June 2026) | CC BY-SA 4.0 | Each name that the list links as "Suku …", the province section and the regency row it is listed under, the article that its link lands on, and whether that article exists |

The list itself cites Ronsumbre (2020), *Ensiklopedia Suku Bangsa di Provinsi Papua Barat* (Kepel Press), for Papua Barat and Papua Barat Daya, and the 2007 page "Suku Bangsa (Etnis) Dan Bahasa Daerah" of the Papua provincial government for the other provinces. Those citations stay on Wikipedia; ETNOS cites the list.

No article text was copied. Each new entry's description is one sentence that ETNOS writes: *Tercantum dalam Daftar suku bangsa di Papua di Wikipedia bahasa Indonesia, di bawah Kabupaten …*. Every new entry has *belum ada tulisan* until someone writes its article.

## Counts

- **278 peoples** are linked in the six province sections (Papua Barat, Papua Barat Daya, Papua, Papua Pegunungan, Papua Selatan, Papua Tengah). 9 were already in the knowledge seed (Mee, Moni, Amungme, Kamoro, Biak, Waropen, Dani, Lani, Yali), so **269 are new**.
- **138** link to an article that exists (after a redirect where there is one); the other 140 link to an article that does not exist yet, and their source link is the list page itself.
- **108** have a language, because exactly one language of the catalogue (Glottolog names) has the same name as the people or as a name that the list gives for the same link (for example *Namblong/Nimboran* gives Nimboran). The others have none rather than a guess.

## Rules the builder follows

- The Papua Nugini section is left out, because the catalogue covers Tanah Papua in Indonesia.
- Only links to titles that start with "Suku " count. *Cina Serui* (linked to *Tionghoa Papua*) and names without a link of their own (*Kwerba*, *Kaiy*, *Yoke*, *Web*, which head a group of linked names) were left out.
- Two titles that redirect to the same article stay two entries, because the list names them apart (for example *Suku Mbaham*, *Suku Matta* and *Suku Iha* all land on *Suku Mbaham–Matta*). A link that lands on an article that is not about a people (*Suku Mapia* goes to *Kerajaan Mapia*) counts as no article.
- A regency comes from the table row, or from a parenthesis in the Papua Barat lists that names a catalogue regency (*Irarutu (Kaimana)*). The wilayah adat follows from the regency in the catalogue.

## Not imported yet

The per-province categories (*Kategori:Suku bangsa di Papua* and the five others) hold some articles that the list does not name, among them Suku Aero, Hanasbey, Suku Sasawa, Suku Kaipuri, Suku Arguni, Suku Bedoanas, Suku Abau, Suku Pyu and Suku Bajau. Several are other names for listed peoples, and Bajau is not a people of Tanah Papua by origin, so they were left for a person to check.

## How they reach the site

The peoples join the knowledge seed through `withSuku` (`src/suku.ts`). Entry pages show them at once, before a node imports the seed. Studio's knowledge seed import (`POST /v1/knowledge-model/seed`) then stores them; it adds missing entities only. A later fix to a stub's description replaces it only while the row still holds a description that the seed shipped (`previous`), so a steward's edit stays.

## Rebuilding

```sh
python3 -I scripts/suku/build-suku.py fetch /tmp/etnos-src/suku
python3 -I scripts/suku/build-suku.py build /tmp/etnos-src/suku seed/suku/tanah-papua-suku.json
```

`fetch` uses `index.php` only, one request per second, because the MediaWiki API answered "too many requests" from shared addresses. The list changes over time, so a later fetch can give other counts; `build` is deterministic.
