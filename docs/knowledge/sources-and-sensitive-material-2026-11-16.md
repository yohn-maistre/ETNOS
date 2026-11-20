# Sources, digging deeper, and sensitive material

16 November 2026. Decisions from the owner after the first wiki seed, and how they change the plan. The direction document points here.

## What changed

1. **Catalogue every source, whatever its licence.** The seed pages rest on Wikipedia because that is what we may copy. Most of what has been written about Mee Pago, Saireri and La Pago is in books, theses, mission and colonial records, archives and human-rights reports that we may not copy. We still record that they exist, where they are held, what they cover, and a short summary taken from the record (abstract, table of contents, catalogue entry). A page lists them under "Bacaan lanjut" even when nobody can read them online.
2. **Aksara keeps digging.** Finding earlier and better sources is a standing behaviour of the resident steward, not a one-off survey.
3. **Conflict, casualties and displacement go on the pages.** Other platforms leave them out. This one should hold them, with every figure attributed to whoever reported it.
4. **Sacred and restricted material is catalogued deeply** and housed in community spaces. See the section below for where the line sits and why.
5. **Imperfect is acceptable.** Community projects, churches, NGOs and elders' circles get things wrong too; that is part of why researchers struggled. Pages start from what is recorded and improve once people are here. Small doubts (how the name "Dani" arose) do not hold a page back.
6. **Fewer guardrails before testing.** The posting and editorial mandates are too hard for an operator to use. They are replaced by one switch per agent per community (see the direction document, "Agent switch").

## The source catalogue

Stored in `seed/sources/<region>.json`, one entry per source:

- title, authors, year, kind (ethnography, expedition report, mission record, archive collection, thesis, article, grammar, dictionary, human-rights report, dataset)
- language, access (open, library, paywalled, archive only, restricted), licence as stated
- where it is held (URL, DOI, or institution and call number)
- the wiki pages it is about, and topics
- a 2–4 sentence summary from the fetched record
- sensitivity: none, conflict, sacred, restricted, personal

In the app the catalogue becomes a source list on each page and a searchable "Bacaan" view per place. A catalogue entry is a record about a source; it never holds the source's text unless the licence allows. The verified sentences we may store (open licences, short quotes for fact sheets) stay on the shelf as before.

## Aksara digging for earlier sources

What the resident steward does on a schedule, one small step per wake:

1. **Depth per page.** Each page has a "source depth": the year of the earliest source known to it and the number of independent sources. Wikipedia in two languages counts as one.
2. **Pick the thinnest page.** Aksara picks the page with the fewest independent sources, or the latest earliest-source, and searches: OpenAlex, Garuda and Indonesian university repositories, Delpher and KITLV/Leiden for Dutch-era material, archive.org, PARADISEC and ELAR for languages, and human-rights and church reports for conflict.
3. **Propose, do not publish.** Each find becomes a catalogue proposal with its record and summary. A steward accepts it with one tap. Accepted open sources go onto the shelf and can feed fact sheets.
4. **Compare.** When a new source gives a different figure, date or account, Aksara records both side by side ("Dicatat berbeda") and posts a short note to the place's stream asking who knows better.
5. **Report.** Each week the place's Aksara posts what it found: new sources, the earliest one so far, and the gaps it could not fill. Gaps become questions to members.

The earliest written records about the highlands are mostly Dutch: expedition reports from the 1900s–1930s, mission and administrative records. Oral history is older than any of them, which is why the "ask members" step matters as much as the search.

## Conflict, casualties and displacement

These go on public pages under "Sejarah" or their own sections, written from sources and attributed:

- Every figure says who reported it: "Menurut Komnas HAM ...", "Human Rights Monitor mencatat ...", "Pemerintah menyatakan ...". Where sources differ, all are given. Nothing is averaged.
- Events carry dates and places as precisely as the sources allow.
- An accusation against a named living person is reported as a claim by its source, never stated as fact.
- Posts from place agents about current conflict events use the same rule and link the source. They are no longer held for a steward's release; the earlier "Held" level now covers only accusations against named living people.

## Owner decision, 16 November (later): surface first, gate after deployment

This replaces the three-layer table below where they differ. The owner's reasoning: the main threat to deep knowledge about Papua is that nobody can find it, so it is being lost. Gating it before any community is here imposes an outside idea of how Indigenous communities should handle their own knowledge. So:

- Published material, including material described as sacred, is surfaced on pages with attribution.
- For what is absolutely sacred, the page refers to the original document and summarises what it is, without reproducing the ritual detail.
- Gating comes once communities are on the platform and decide for themselves, using the private spaces on their own PDSes.
- What stays: a fast way for anyone to flag a passage ("Jangan disebarkan") so a steward can hide it while it is discussed.

## Sacred and restricted material

The owner asked to go deep here, with private material held in community PDSes. Agreed, with one line that keeps the platform's promise to communities:

| Layer | Example | Where it goes |
| --- | --- | --- |
| Already public, published by outsiders | Practices described in Wikipedia, museum catalogues, tourist literature | Public page, attributed, with a notice that the community can ask for changes ("Jangan disebarkan" sends it to review) |
| Published, but the source or the community calls it restricted | Ritual detail an ethnographer recorded under restriction; objects a museum marks as sacred | Catalogue entry on the public page saying the material exists, who recorded it, where it is held and its subject. The content itself goes only into that community's own space |
| Held by the community and never written down | Knowledge kept by a clan or an elders' circle | Only the community decides, in its own space, under its own protocol |

Why this line: the platform's offer to communities is that they decide what is shared. If we publish restricted material before anyone from the community is here, we have broken that offer on day one. Cataloguing it does the useful work: people can see what was taken and where it sits, which is the first step to bringing it home. The private space on a community's PDS is ready for when they want it.

Practical consequences:

- The source catalogue marks `sensitivity` on every entry. A page shows sacred and restricted sources as catalogue entries with a Local Contexts notice where one applies.
- Aksara never copies restricted content into a public page, post or fact sheet, even when a source is open-licensed.
- Repatriation is a feature: a catalogue entry can link to the holding institution's contact and record any request a community makes.

## Changes to the seed

1. Add conflict, displacement and history sections to the 39 seed pages from open sources first (Wikipedia's own sections, which the survey skipped) and from human-rights reports as attributed short quotes.
2. Add "Bacaan lanjut" to each page from the catalogue.
3. Add the catalogue's sacred and restricted entries as catalogue lines, not content.
