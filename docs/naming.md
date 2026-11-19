# Naming rule

Decided by the owner on 19 November 2026. The rule covers the interface, documents, the proposal and slides. Every agent working in this repository follows it.

## The rule

1. **Name a thing by what it is or what it does.** A newcomer should know what a feature does from its name alone. Good examples: *Kamus komunitas*, *Laporan sumber*, *Jadwal Aksara*, *Pesan suara*.
2. **No metaphors, slogans or coined brand names for features.** Avoid names like *Bahasa Tumbuh*, *Lensa Kita*, *Denyut*, *Mata kedua* or *Suara hutan*. A sentence such as "setiap komunitas mendapatkan laman khusus yang kami sebut Bahasa Tumbuh" must not appear anywhere.
3. **Use the term from where the thing comes from**, when one exists:
   - the community's own word for it;
   - the legal or administrative term (*masyarakat hukum adat*, *objek pemajuan kebudayaan*, *wilayah adat*);
   - the standard technical term (*kamus*, *glosarium*, *klaster*, *metadata*, *Leiden*, *link prediction*).

   Keep a research method's proper name (Two-Eyed Seeing, Etuaptmumk) as a citation, not as a feature name.
4. **Neutral tone.** Descriptions say what something does and what it does not do. No drama, no "revolutionary", no claims of firsts in the interface.
5. **Product names stay as they are:** Strata (the software), ETNOS (the deployment), Aksara (the assistant). Do not add new ones.
6. **Language.** The interface is in plain Indonesian. Documents are in English, with the Indonesian interface label given once in italics.
7. **When in doubt**, use a two- or three-word description, even if it is longer than a catchy name.

The earlier plain-names table in `showcase-plan-2026-11-17.md` §11 still holds; this rule extends it.

## Renames from the 18–19 November documents

| Was | Now (interface) | In English |
| --- | --- | --- |
| Bahasa Tumbuh | Kamus komunitas | Community dictionary (with grammar notes) |
| Bantu kamus (room permission) | Izin pengolahan mesin | Machine processing permission |
| Ritme | Jadwal Aksara | Aksara's schedule |
| Reel / *Temuan* selector beside *Terbaru* | Kartu (tab beside Terbaru) | Cards |
| Denyut (monthly), Laporan Denyut Budaya | Laporan bulanan | Monthly report |
| Lensa Kita | Istilah lahan dan citra satelit | Land terms and satellite data |
| Kata Bersama | Perbandingan kosakata | Word comparison across languages |
| Siapa yang menulis Papua? | Laporan sumber | Source report (who wrote what is recorded) |
| Mata kedua (entity panel) | Data pengukuran | Measurement data |
| Constellation / Rasi | Klaster | Cluster |
| Lanskap berubah (card) | Perubahan lahan | Land change |
| Suara hutan (card) | Spesies dalam rekaman | Species in a recording |
| Suara warga (card) | Jawaban suara | Voice answer |
| Cuaca dan musim (card) | Cuaca dan musim (kept: it is plain) | Weather and season |
| Epistemic multiplex | Model pengetahuan | Knowledge model (the term "multiplex network" stays in technical sections) |

Proposal threads (`rationale-threads-2026-11-19.md`):

| Was | Now |
| --- | --- |
| Ditulis tentang kita (written about us) | Sumber tentang Papua kebanyakan ditulis dari luar |
| Kedaulatan pengetahuan | Kedaulatan data dan pengetahuan (kept, a policy term) |
| Observatorium yang berakar | Observatorium kebudayaan berbasis komunitas |
| Dua mata | Pengetahuan lokal dan sains |
| Pengetahuan yang hidup | Catatan yang terus diperbarui |
| Ruang bersama yang terawat | Ruang bersama yang dikelola |
| Dapat dipercaya | Dapat diperiksa |
| Berkelanjutan dan bisa dibawa | Keberlanjutan dan portabilitas |

## Interface labels to check (for the coding agent)

Read on 19 November in `apps/web/src`. Most labels are already plain. These are the exceptions:

| Where | Now | Suggested |
| --- | --- | --- |
| `CoreSample.svelte` | Lapisan tempat | Ringkasan tempat |
| `StudioPage.svelte` | Temuan | Sumber ditemukan |
| `AboutPage.svelte` | "Jejak setiap halaman wiki…" | "Riwayat setiap halaman wiki…" |
| `AboutPage.svelte` | "Temuan Aksara sebagai posting…" | "Sumber yang ditemukan Aksara, sebagai posting…" |
| `NewsIndex.svelte` | Sorotan (filter) | Utama |
| `WikiTrail.svelte` (comment and title) | Jejak | Riwayat sumber |

*Ranah* stays: it is the domain term used in UU 5/2017 and by UNESCO.
