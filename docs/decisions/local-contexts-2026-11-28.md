# Local Contexts Notices and Labels (28 November 2026)

The owner accepted this on 27 November 2026. It sets how ETNOS shows [Local Contexts](https://localcontexts.org/) Notices and Labels on the word data and the services it runs. The code is `src/local-contexts.ts`, the migration that creates `local_contexts_collections` in `src/schema.ts`, the routes `GET /v1/local-contexts` and `POST /v1/local-contexts/<key>` in `src/api.ts`, the badges in `apps/web/src/LocalContextsNotices.svelte`, the Studio form in `apps/web/src/LocalContextsSettings.svelte` and the test in `test/local-contexts.test.ts`.

## The rule

- **Labels are applied only by communities.** Traditional Knowledge (TK) Labels and Biocultural (BC) Labels say how a community wants its knowledge used. Local Contexts lets a community apply them only through its own project on the [Local Contexts Hub](https://localcontextshub.org/). See [About the Labels](https://localcontexts.org/labels/about-the-labels/).
- **Notices are applied by institutions and researchers.** A Notice says that a collection may hold Indigenous knowledge or data, or that an institution is ready to work with the community on it. See [About the Notices](https://localcontexts.org/notices/about-the-notices/).
- **ETNOS never applies a TK Label or a BC Label for a community.** It has no field for a Label. The API refuses a `labels` field with 400 and names the Hub as the place for Labels, and a test checks this. When a community has a Hub project for a collection, the node operator enters that project's ID and the page links to the project, where the community's Labels show.

## What ETNOS stores

One row per collection in `local_contexts_collections`.

- `collection` is the key, which matches a wordlist dataset key (`tng`, `abvd`, `berry1987`, `papuanvoices`), the Ekari seed (`steltenpool1969`) or `etnos` for the service itself.
- `project_id` is a Local Contexts Hub project ID (a UUID, stored in lower case). An empty value means no project is linked.
- `notices` holds the extra Notices that the operator added, as a JSON list drawn from the four Notices an institution may apply: Attribution Incomplete, Open to Collaborate, TK Notice and BC Notice.
- `updated` and `updated_by`. Every change is also written to the audit log as `local-contexts.set`.

Only the node operator can change a row. Every collection here is public data, so the list is public and edge-cached for 90 seconds.

## The Hub API needs a key

The Hub API v2 at `https://localcontextshub.org/api/v2/` answered "Authentication not provided." on 27 November 2026 without an account key. So ETNOS stores only the project ID and links to `https://localcontextshub.org/projects/<id>/`. It does not fetch or copy Labels from the Hub. If a node later holds a Hub key, it can read the project's Labels, but it should still show them as the community's and link to the project.

## The Notices ETNOS ships

| Collection | Notice | Why |
| --- | --- | --- |
| ETNOS | Open to Collaborate | ETNOS is ready to work with the communities whose data it shows. |
| TransNewGuinea.org | Attribution Incomplete | Outside researchers collected these wordlists, and the speakers who gave the words are mostly not named. |
| ABVD | Attribution Incomplete | The same. |
| Berry & Berry 1987 | Attribution Incomplete | The same. |
| Steltenpool 1969 | Attribution Incomplete | A missionary dictionary. The speakers who gave the words are not named. |
| Papuan Voices | none | Its citation names the team that made the recordings in Tanah Papua, and the team includes researchers from Tanah Papua. ETNOS did not check whether every speaker is named, so this is a judgement call. The operator can add a Notice in Studio. |

Each Notice shows with one line of plain Indonesian that says what it means:

- Attribution Incomplete: "Daftar ini dikumpulkan oleh peneliti dari luar, dan nama orang atau komunitas yang memberi kata-katanya belum dicatat lengkap. Komunitas asal dapat melengkapi atau membetulkannya."
- Open to Collaborate: "ETNOS terbuka untuk bekerja sama dengan komunitas asal tentang cara data ini dicatat, dirawat dan dibagikan."

## Where it shows

The badges are plain text with a link to the Notice's page on localcontexts.org and no icon. Local Contexts asks that its Notice and Label icons be used as issued, and ETNOS will use them only once Abstraksi registers on the Hub as an institution. The badges show:

- on Peta Kata, at the foot of the Sumber section;
- on a language page, at the foot of the Kamus tab, for the datasets that hold words in that language;
- in the Studio settings (`/studio/pengaturan`), where the operator adds Notices and links a Hub project.

## Not done

- Abstraksi is not registered on the Hub yet, so ETNOS shows no Notice icons and no Hub-issued Notices.
- Community Kamus entries do not carry Notices. A community that wants Labels on its own Kamus makes a Hub project. A later step can let the community's steward, not the operator, enter the project ID for that community.
