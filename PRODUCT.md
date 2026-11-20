# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Papuans, Papuan communities and lembaga adat in Tanah Papua. They talk in communities, read local news and build shared knowledge about their places, peoples and languages, mostly on phones. Researchers and the public read without an account. (Confirmed by the owner, 20 November 2026.)

## Product Purpose

ETNOS (etnos.space) is the first deployment of Strata, open-source software (AGPL-3.0) that turns a region's everyday conversation into a record its people own, check and correct. Success is a community whose talk becomes checked knowledge it controls: wiki pages with sources, a dictionary, a map of what is known and what is not.

The problem in one line: what is alive is not recorded, and what is recorded is not alive. What is written about Tanah Papua is mostly written by outsiders, while what Papuans say every day disappears in chats and feeds. Badan Bahasa counts 428 languages in Tanah Papua, and regional-language use in Provinsi Papua is among the lowest in Indonesia (BPS 2024 as reported; check the table before quoting). Internet use in Maluku and Papua is 69.74% against 81.72% nationally (APJII 2026). In our own seed, 92% of quoted sentences come from Wikipedia, and culture and ecology are under 6% of what is written.

The legal ground: UUD 1945 Art. 18B(2), 28I(3) and 32(2); UU 21/2001 as amended by UU 2/2021 (Otonomi Khusus Papua) Art. 43, 44, 57 and 58 on adat rights, the intellectual property of Orang Asli Papua, culture and languages; UU 5/2017 on Pemajuan Kebudayaan; UU 28/2014 Art. 38 on traditional cultural expressions; UU 27/2022 on personal data. Details and sources are in docs/plan/framing-and-impact-2026-11-17.md and docs/plan/rationale-threads-2026-11-19.md.

The main measure of success is the share of the record written by people of the region, alongside how many statements are checked by them and how many gaps they close.

## Positioning

Conversation and knowledge in one place, owned by the community. Aksara, an AI assistant, proposes words, meanings and claims from the talk; members check them one card at a time (Periksa); the community decides what is published. Accounts use the AT Protocol, so people can take their account and data elsewhere.

## Operating Context

Phones first, often on slow or costly connections. Most people meet ETNOS through Beranda (the feed), Jelajah (discovery), Wiki and community pages. The theme follows the time of day until the reader picks one. Entered in BUDAYA GO! 2026, category Inovasi Digital, subtheme Platform Digital untuk Komunitas Budaya. The proposal, video and deck are uploaded on 26 to 27 November 2026; the showcase is 18 to 19 December 2026.

## Capabilities and Constraints

Svelte 5 web app with shadcn-svelte and bits-ui components on Cloudflare Workers and SQLite Durable Objects, free tier first. Interface language is plain neutral Indonesian following docs/voice.md and docs/naming.md: no colon lists, no "bukan X tapi Y", no poetic phrasing, no em dashes, eyebrows only rarely. Components come from the libraries already in use wherever they fit.

## Brand Commitments

The wordmark "etnos." and the ink-print landscapes of Tanah Papua are ETNOS's imagery. The UI was first inspired by Threads and keeps that lineage: clean, weighty, well spaced. The visual system is called Grafit and is documented in DESIGN.md; Grafit is also the default base palette (owner, 20 November 2026).

## Evidence on Hand

Real public content only: posts, communities, wiki pages with cited sources, the knowledge model in apps/web/public/observatory/knowledge, news summarised by the built-in news desk. No invented users, numbers, testimonials or claims.

## Product Principles

- Private content and metadata never reach public paths.
- Every statement keeps its source; gaps are shown, not hidden.
- The community decides what is published; the AI proposes and never votes.
- Plain words for everyone; nothing that reads as marketing.
