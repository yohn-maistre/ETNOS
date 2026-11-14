# Design direction: one stream, three materials

14 November 2026. Agreed with the owner as the direction for the BUDAYA GO! build. The visual exploration lives in a private design canvas. This file records the decisions so the code can follow them.

## The idea

ETNOS should feel like a social app people already know. Everything appears in one stream. Aksara posts there too, like any participant: "Sa ketemu ini, tolong periksa dulu."

The difference is material. Each item looks like what it is.

| Material | What it holds | How it looks |
| --- | --- | --- |
| **Raised** | What's happening now: posts, news, polls, offers | The white stream panel, lifted off the mist background. Sans serif. |
| **Dashed** | What's still forming: Aksara's findings, gaps, notes, anything waiting to be checked | A dashed outline set in from the panel edge. Always has check buttons. |
| **Recessed** | What has settled: reviewed wiki pages | A well sunk into the panel, with a serif title and a thin voice bar along its base. |

The deeper something sits, the more settled it is. That's *strata*, made visible without a separate screen.

## Navigation

The Home stream and every place page share three tabs: **Semua**, **Perlu dicek** and **Pengetahuan**. The sort control (Terbaru, Aktif, Sorotan) stays where it is. *Perlu dicek* is where people help: Aksara's findings, open gaps and flagged claims.

Keep "Wiki" in the navigation. Everyone knows the word. The Wiki home is titled *Pengetahuan bersama*.

## The place page

A place page looks like a community page: a cover, a name, a follow button and the three tabs.

Its cover is the ink-print landscape. Below the horizon the land is cut open into layers. The top layer is sharp, because news and talk keep arriving. The bottom layer, *arsip dan cerita lama*, is blurred and marked *belum terindeks*. Each story, archive and source someone adds makes it clearer. This is the one bold moment in the system. Everything around it stays quiet.

Gaps say *belum terindeks*. Never "empty", and never a completeness percentage.

## The wiki page

- Serif reading column. Sources as numbered notes in the right rail on desktop, inline on mobile.
- A voice bar under the title shows whose voices the page rests on. Version one is page-level, from data we already have: outside sources, community members and pending Aksara drafts. Archives, knowledge holders and institutions come later, once revisions carry a typed voice.
- Pending Aksara proposals sit inside the page as dashed blocks with *Terima*, *Ubah dulu* and *Tolak*.
- Selecting a paragraph offers *Saya tahu ini*, *Versi saya beda*, *Perlu sumber* and *Jangan disebarkan*. Only reviewers see the counts. *Jangan disebarkan* sends the passage to review straight away.
- *Versi yang tercatat* puts accounts side by side when people remember differently. An empty community column invites a story instead of hiding.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Kabut | `#E8EAE4` | Page ground. Cooler than the old cream. |
| Permukaan | `#FBFBF8` | Raised stream panel |
| Ceruk | `#ECEEE7` | Recessed wells |
| Tinta | `#1A211E` | Text |
| Tinta danau | `#1F4E8C` | Links, print ink, Aksara's dotted ring |

Voice colours: outside sources `#7D8A96`, community `#4F8A55`, Aksara draft as a cobalt hatch, then later archive `#B0862F`, knowledge holders `#2E5E5A` and institutions `#5B5196`. There's no red, so the voice bar never reads as a flag. Every colour carries a text label.

Type: **Plus Jakarta Sans** (designed in Indonesia) for anything spoken or live. **Geist Serif** for anything settled: page titles, place names and reviewed text. The typeface tells you how settled something is.

These become a new default appearance base. The existing bases and accents stay available in settings.

## Aksara in the stream

- At most two findings a day in one community.
- Always labelled as an AI, always with sources.
- Asks to be checked. Never takes a political side.
- Community stewards can pause it at any time.
- Writes casually in the community's register when the community allows it, and plain Indonesian otherwise.

## Offers and a market

Keep offers and requests free for everyone. Add a **Pasar** community type for a place, where local sellers gather. Businesses can pay a small flat fee for a shop profile, a simple catalogue, an order link and a disclosed, rotating *etalase* slot inside Pasar. Individuals and craftworkers list for free up to a limit. Paid placement never appears in conversation or knowledge, and never uses poll, political or private data for targeting. Treat it as modest local revenue and a community service. Payments wait until a provider such as QRIS is integrated.

## Directions considered

- **Community newspaper:** an editorial front page per place. It's strong for synthesis but less social. Its DNA goes into the weekly *Apa artinya buat kita* card.
- **Map first:** beautiful but heavy, and less familiar. The map stays as a later view.
- **Separate observatory screens:** clearer for researchers, but they split knowledge from daily life. Rejected in favour of one stream.
