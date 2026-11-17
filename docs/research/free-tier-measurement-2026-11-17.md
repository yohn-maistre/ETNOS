# Free tier measurement, 17 November 2026

Question from the owner: can Workers Free carry the alpha (about 30 people at most, in practice 5 to 20, most not posting daily), and what must change so it does?

Short answer: yes, after today's fixes. A deliberately heavy simulated day for 30 people now uses **40% of the daily SQL read allowance, 9% of requests and under 2% of writes**. Before the fixes the same day used **102% of reads**, so ETNOS would have hit the wall at about 30 active people as the content grew.

## How it was measured

- `scripts/load-day.mjs` runs the real Durable Object in workerd (Miniflare, SQLite storage), seeds it at showcase scale, then plays one day for N people through the HTTP API. The node meters itself (below), so the numbers are workerd's own `rowsRead` and `rowsWritten`, the quantities Cloudflare bills.
- Showcase scale is 200 wiki pages, 2,000 posts (a third of them threads, the rest replies), 6 communities and 30 members.
- The heavy day for each person is 6 visits of 9 screens, 54 screens in all: home, a community, following, three threads, two wiki pages and a search. Each person also makes 3 posts, 6 replies, 15 votes and 2 bookmarks. Everyone does all of it, which is far above what the alpha will see.
- `scripts/trace-rows.mjs` lists every SQL statement that reads 50 or more rows for the common routes. That is how the hotspots below were found.
- Calls run one at a time. The node interleaves concurrent requests, so per-request row deltas overlap and over-count; an early concurrent run reported 8.0M rows for that reason. Daily totals in production now come from the global counter and are exact. The per-route split stays approximate.

## Results (30 people, heavy day, Workers Free daily limits)

| | Before | After | Free limit |
| --- | --- | --- | --- |
| Durable Object requests | 15,720 (15.7%) | 9,060 (9.1%) | 100,000 |
| SQL rows read | 5.10M (102%) | 1.99M (39.8%) | 5,000,000 |
| SQL rows written | 1,530 (1.5%) | 1,530 (1.5%) | 100,000 |
| Server errors | 0 | 0 | |

Worker requests are close to the Durable Object count plus first page loads (about 180 in this day). Static files no longer count, see below.

Where the reads go now, per call: the home feed about 1,500 rows (30 posts, each with about ten lookups for votes, bookmarks, media, polls and offers), the wiki list 413, search 995, notifications 237, a thread's replies 171, a wiki page's history 215. Everything else is under 110.

## What changed

1. **The feed query used no index for threads and filters.** `feedPage` was one query with every optional filter written as `(? IS NULL OR …)`, which stops SQLite choosing the root, community or author index. Opening a thread with three replies read all 2,000 posts. The query is now built from only the filters in use: replies dropped from 2,003 rows to under 50, and the home feed's main statement from 1,000+ to 123. Same results; all 195 tests pass.
2. **Reply notifications started from every post.** The join now starts from the reader's own posts (author index), 747 rows down to 237.
3. **Memberships by person had no index.** Migration 36 adds `memberships(actor_id, active, community_id)`.
4. **Every screen reloaded eight endpoints.** The communities list, wiki list, memberships, capabilities, following and the unread count are now reused for a minute and refreshed after any write. Pull to refresh and the retry button force a refresh. Thread and wiki pages no longer fetch a home feed they never show.
5. **Static files ran the Worker.** `run_worker_first: true` sent every script, font and image through the Worker, so each first page load cost about ten of the 100,000 daily requests. Static folders are now served directly; a `_headers` file keeps `nosniff`, the referrer policy and long caching on hashed assets.
6. **Every request rewrote the alarm.** `setAlarm` is a storage write that the SQL meter cannot see. It was called after every request, about 9,000 hidden writes a day here. It is now written only when the schedule moves earlier.

## Metering in production

- Each request and alarm logs one line with the route shape only (ids, slugs and queries replaced by `:id` or dropped), status, wall time, rows read and written. No actor, content or search text. Workers Logs is on with invocation logs off, because invocation logs record full URLs including search text. Workers Logs Free keeps 200,000 events a day for 3 days.
- `GET /v1/ops/usage`, operator only, returns the last 14 days: requests, alarms, errors, rows read and written, each as a share of the free limit, and the twelve heaviest routes. Totals are saved to the node's key-value storage at most every five minutes (about 300 writes a day).
- Not measured here: Worker CPU time (the web Worker only routes and rewrites HTML, far under 10 ms), Workers AI neurons, key-value and alarm writes outside SQL, and the identity host (task 24, measured separately).

## What to watch

- **Aksara's recurring work.** It runs on Durable Object alarms: news sources wake hourly each (one source per wake), the resident runs on each schedule, and a queued job wakes the node every second until it finishes. Each wake is a request and reads rows. The usage page lists it as `ALARM alarm`. Read it daily during the alpha; if Aksara costs more than people do, lengthen schedules before anything else.
- **Wiki growth.** The wiki list is returned whole (up to 100 pages) and read about once a minute per active reader. At 500+ pages it needs paging or a cached public copy.
- **The feed projection.** About ten lookups per page of 30 posts. Skipping lookups for features a page has none of (polls, offers, events) would save about a quarter.

## Capacity, plainly

At the measured cost, the read allowance covers about 75 people on the heavy profile above, every day. The alpha profile (5 to 20 people, most reading more than posting) uses a small fraction. The Workers Paid plan ($5 a month) raises reads to 25 billion a month and is the next step only if the usage page shows a sustained trend past 60%.

## How to rerun

```bash
npm run test:worker
```

```bash
node scripts/load-day.mjs 30 200 2000
```

```bash
node scripts/load-day.mjs --old-client 30 200 2000
```

```bash
node scripts/trace-rows.mjs
```
