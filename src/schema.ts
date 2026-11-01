import type { Database } from './database.ts'

export const schema = `
CREATE TABLE IF NOT EXISTS actors (
 id TEXT PRIMARY KEY, did TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('human','agent')), operator_id TEXT REFERENCES actors(id)
);
CREATE TABLE IF NOT EXISTS credentials (
 hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS communities (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('public','listed-private','hidden-private')),
 automation INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS memberships (
 community_id TEXT NOT NULL REFERENCES communities(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 role TEXT NOT NULL CHECK(role IN ('owner','moderator','member')), active INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(community_id,actor_id)
);
CREATE TABLE IF NOT EXISTS mandates (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES actors(id), community_id TEXT NOT NULL REFERENCES communities(id),
 purpose TEXT NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, hourly_limit INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sources (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES actors(id), bytes BLOB NOT NULL,
 digest TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, withdrawn INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS releases (
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), source_revision INTEGER NOT NULL,
 community_id TEXT NOT NULL REFERENCES communities(id), publisher_id TEXT NOT NULL REFERENCES actors(id),
 text TEXT NOT NULL, digest TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0,
 post_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES actors(id), community_id TEXT NOT NULL REFERENCES communities(id),
 parent_id TEXT REFERENCES posts(id), text TEXT NOT NULL, created INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0,
 mandate_id TEXT REFERENCES mandates(id), release_id TEXT UNIQUE REFERENCES releases(id), uri TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS posts_community_created ON posts(community_id,created);
CREATE TABLE IF NOT EXISTS outbox (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), operation TEXT NOT NULL CHECK(operation IN ('put','delete')),
 state TEXT NOT NULL CHECK(state IN ('pending','sending','uncertain','delivered','cancelled')),
 repo TEXT NOT NULL, rkey TEXT NOT NULL, record TEXT, cid TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 UNIQUE(post_id,operation)
);
CREATE TABLE IF NOT EXISTS audit (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL,
 target TEXT NOT NULL, created INTEGER NOT NULL
);
`;

const migrations = [schema, `
ALTER TABLE communities ADD COLUMN admission TEXT NOT NULL DEFAULT 'approval' CHECK(admission IN ('open','approval','invite'));
UPDATE communities SET admission='invite' WHERE visibility!='public';
CREATE TABLE join_requests (
 community_id TEXT NOT NULL REFERENCES communities(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 message TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','approved','declined')),
 created INTEGER NOT NULL, PRIMARY KEY(community_id,actor_id)
);
CREATE TABLE invitations (
 hash TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
 issuer_id TEXT NOT NULL REFERENCES actors(id), recipient_id TEXT NOT NULL REFERENCES actors(id),
 expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0
);
`, `
CREATE TABLE votes (
 post_id TEXT NOT NULL REFERENCES posts(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 value INTEGER NOT NULL CHECK(value IN (-1,1)), PRIMARY KEY(post_id,actor_id)
);
CREATE TABLE bookmarks (
 post_id TEXT NOT NULL REFERENCES posts(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 created INTEGER NOT NULL, PRIMARY KEY(post_id,actor_id)
);
CREATE TABLE reports (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), reporter_id TEXT NOT NULL REFERENCES actors(id),
 reason TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('open','resolved','dismissed')),
 decision TEXT, reviewer_id TEXT REFERENCES actors(id), created INTEGER NOT NULL,
 UNIQUE(post_id,reporter_id)
);
CREATE TABLE topics (id TEXT PRIMARY KEY, title TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE);
CREATE TABLE community_topics (
 community_id TEXT NOT NULL REFERENCES communities(id), topic_id TEXT NOT NULL REFERENCES topics(id),
 PRIMARY KEY(community_id,topic_id)
);
CREATE INDEX bookmarks_actor ON bookmarks(actor_id,created);
CREATE INDEX reports_post_state ON reports(post_id,state);
CREATE INDEX votes_post ON votes(post_id);
`, `
ALTER TABLE communities ADD COLUMN publication TEXT NOT NULL DEFAULT 'local' CHECK(publication IN ('local','atproto'));
UPDATE outbox SET state='cancelled' WHERE operation='put' AND state='pending';
`, `
CREATE TABLE wiki_pages (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), title TEXT NOT NULL,
 revision_id TEXT, created INTEGER NOT NULL
);
CREATE TABLE wiki_proposals (
 id TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES wiki_pages(id), author_id TEXT NOT NULL REFERENCES actors(id),
 base_revision_id TEXT, text TEXT NOT NULL, citations TEXT NOT NULL, language TEXT NOT NULL,
 perspective TEXT NOT NULL, digest TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','accepted','rejected')),
 created INTEGER NOT NULL
);
CREATE TABLE wiki_revisions (
 id TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES wiki_pages(id), parent_id TEXT REFERENCES wiki_revisions(id),
 proposal_id TEXT NOT NULL UNIQUE REFERENCES wiki_proposals(id), author_id TEXT NOT NULL REFERENCES actors(id),
 reviewer_id TEXT NOT NULL REFERENCES actors(id), text TEXT NOT NULL, citations TEXT NOT NULL,
 language TEXT NOT NULL, perspective TEXT NOT NULL, digest TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX wiki_community ON wiki_pages(community_id,created);
CREATE INDEX wiki_page_proposals ON wiki_proposals(page_id,created);
`, `
CREATE TABLE oauth_records (
 kind TEXT NOT NULL CHECK(kind IN ('state','session')), key TEXT NOT NULL,
 sealed TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(kind,key)
);
CREATE TABLE browser_sessions (
 hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), csrf TEXT NOT NULL,
 created INTEGER NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE enrollment_allowlist (did TEXT PRIMARY KEY, added_by TEXT NOT NULL REFERENCES actors(id));
CREATE TABLE auth_buckets (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE TABLE starter_spaces (slug TEXT PRIMARY KEY, community_id TEXT NOT NULL UNIQUE REFERENCES communities(id));
`, `
ALTER TABLE posts ADD COLUMN root_id TEXT REFERENCES posts(id);
WITH RECURSIVE roots(id,root) AS (
 SELECT id,id FROM posts WHERE parent_id IS NULL
 UNION ALL SELECT p.id,r.root FROM posts p JOIN roots r ON p.parent_id=r.id
) UPDATE posts SET root_id=(SELECT root FROM roots WHERE roots.id=posts.id);
CREATE INDEX posts_root_created ON posts(root_id,created DESC,id DESC);
CREATE INDEX posts_parent ON posts(parent_id,hidden);
CREATE INDEX posts_created ON posts(created DESC,id DESC);
`, `
CREATE TABLE groups (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('collective','institution')),
 visibility TEXT NOT NULL CHECK(visibility IN ('public','hidden-private')),
 sponsorship TEXT NOT NULL CHECK(sponsorship IN ('unrequested','pending','enabled','suspended')),
 created INTEGER NOT NULL
);
CREATE TABLE group_members (
 group_id TEXT NOT NULL REFERENCES groups(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 role TEXT NOT NULL CHECK(role IN ('owner','steward','member')), active INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(group_id,actor_id)
);
CREATE TABLE spaces (
 id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id),
 community_id TEXT NOT NULL UNIQUE REFERENCES communities(id), modality TEXT NOT NULL CHECK(modality='forum'), created INTEGER NOT NULL
);
CREATE TABLE contexts (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('place','region','topic','language')), description TEXT NOT NULL,
 language TEXT NOT NULL, aliases TEXT NOT NULL, created INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE record_contexts (
 record_kind TEXT NOT NULL CHECK(record_kind IN ('post','group','wiki','work')), record_id TEXT NOT NULL,
 context_id TEXT NOT NULL REFERENCES contexts(id), issuer_id TEXT NOT NULL REFERENCES actors(id), created INTEGER NOT NULL,
 PRIMARY KEY(record_kind,record_id,context_id)
);
CREATE INDEX record_context_lookup ON record_contexts(context_id,record_kind,record_id);
CREATE INDEX spaces_group ON spaces(group_id,created);
CREATE INDEX group_members_actor ON group_members(actor_id,active);
`, `
CREATE TABLE work_grants (
 id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), agent_id TEXT NOT NULL REFERENCES actors(id),
 issuer_id TEXT NOT NULL REFERENCES actors(id), expires INTEGER NOT NULL, hourly_limit INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE public_work (
 id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), community_id TEXT NOT NULL REFERENCES communities(id),
 origin_post_id TEXT REFERENCES posts(id), title TEXT NOT NULL, description TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('proposed','adopted','active','blocked','completed','withdrawn')),
 revision INTEGER NOT NULL, result_id TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE work_events (
 id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES public_work(id), group_id TEXT NOT NULL REFERENCES groups(id),
 actor_id TEXT NOT NULL REFERENCES actors(id), kind TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE TABLE work_requests (
 actor_id TEXT NOT NULL REFERENCES actors(id), request_key TEXT NOT NULL, digest TEXT NOT NULL,
 target_id TEXT NOT NULL REFERENCES public_work(id), PRIMARY KEY(actor_id,request_key)
);
CREATE TABLE work_consents (
 post_id TEXT NOT NULL REFERENCES posts(id), group_id TEXT NOT NULL REFERENCES groups(id), author_id TEXT NOT NULL REFERENCES actors(id),
 digest TEXT NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(post_id,group_id)
);
CREATE TABLE work_results (
 id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES public_work(id), author_id TEXT NOT NULL REFERENCES actors(id),
 text TEXT NOT NULL, citations TEXT NOT NULL, digest TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','accepted','rejected')), created INTEGER NOT NULL, grant_id TEXT REFERENCES work_grants(id)
);
CREATE TABLE public_work_results (
 id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES public_work(id), proposal_id TEXT NOT NULL UNIQUE REFERENCES work_results(id),
 text TEXT NOT NULL, citations TEXT NOT NULL, digest TEXT NOT NULL, created INTEGER NOT NULL, reviewer_id TEXT NOT NULL REFERENCES actors(id)
);
CREATE INDEX public_work_group_updated ON public_work(group_id,updated DESC,id DESC);
CREATE INDEX work_events_agent_budget ON work_events(actor_id,group_id,created);
CREATE INDEX work_results_work ON work_results(work_id,created);
`, `
CREATE TABLE editorial_mandates (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES actors(id), community_id TEXT NOT NULL REFERENCES communities(id),
 issuer_id TEXT NOT NULL REFERENCES actors(id), purpose TEXT NOT NULL, expires INTEGER NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0, hourly_limit INTEGER NOT NULL
);
ALTER TABLE wiki_proposals ADD COLUMN editorial_mandate_id TEXT REFERENCES editorial_mandates(id);
CREATE INDEX editorial_proposal_budget ON wiki_proposals(author_id,page_id,created);
`, `
CREATE TABLE activity_reads (
 actor_id TEXT NOT NULL REFERENCES actors(id), event_key TEXT NOT NULL, read_at INTEGER NOT NULL,
 PRIMARY KEY(actor_id,event_key)
);
ALTER TABLE wiki_proposals ADD COLUMN decided INTEGER;
ALTER TABLE join_requests ADD COLUMN decided INTEGER;
`, `
CREATE TABLE dm_devices (actor_id TEXT PRIMARY KEY REFERENCES actors(id),id TEXT NOT NULL UNIQUE,signature_key TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE dm_packages (id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES actors(id),data TEXT NOT NULL,expires INTEGER NOT NULL,thread_id TEXT);
CREATE TABLE dm_threads (id TEXT PRIMARY KEY,sender_id TEXT NOT NULL REFERENCES actors(id),recipient_id TEXT NOT NULL REFERENCES actors(id),sender_device TEXT NOT NULL,recipient_device TEXT NOT NULL,package_id TEXT NOT NULL UNIQUE REFERENCES dm_packages(id),state TEXT NOT NULL CHECK(state IN ('preparing','pending','active','closed')),welcome TEXT,version INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,request_key TEXT NOT NULL,UNIQUE(sender_id,request_key));
CREATE TABLE dm_envelopes (id TEXT PRIMARY KEY,thread_id TEXT NOT NULL REFERENCES dm_threads(id),sender_id TEXT NOT NULL REFERENCES actors(id),client_id TEXT NOT NULL,version INTEGER NOT NULL,ciphertext TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(sender_id,client_id),UNIQUE(thread_id,version));
CREATE TABLE dm_reads (actor_id TEXT NOT NULL REFERENCES actors(id),thread_id TEXT NOT NULL REFERENCES dm_threads(id),version INTEGER NOT NULL,PRIMARY KEY(actor_id,thread_id));
CREATE TABLE dm_blocks (actor_id TEXT NOT NULL REFERENCES actors(id),peer_id TEXT NOT NULL REFERENCES actors(id),PRIMARY KEY(actor_id,peer_id));
CREATE INDEX dm_threads_sender ON dm_threads(sender_id,updated DESC);
CREATE INDEX dm_threads_recipient ON dm_threads(recipient_id,updated DESC);
CREATE INDEX dm_packages_available ON dm_packages(actor_id,expires) WHERE thread_id IS NULL;
CREATE INDEX dm_sender_rate ON dm_envelopes(sender_id,created);
`, `
CREATE TABLE media (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES actors(id),
 community_id TEXT NOT NULL REFERENCES communities(id), post_id TEXT REFERENCES posts(id),
 bytes BLOB NOT NULL, size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
 alt TEXT NOT NULL, position INTEGER, created INTEGER NOT NULL
);
CREATE INDEX media_post ON media(post_id,position);
CREATE INDEX media_owner_created ON media(owner_id,created);
`]


/** DO storage has no PRAGMA user_version or SQL BEGIN/COMMIT support.
 * Existing local v1 tables are adopted by the idempotent first migration. */
export function migrate(database: Database) {
  database.transaction(() => {
    database.exec('CREATE TABLE IF NOT EXISTS strata_migrations (version INTEGER PRIMARY KEY)')
    const version = database.get<{ version: number }>('SELECT COALESCE(MAX(version),0) version FROM strata_migrations')!.version
    if (version > migrations.length) throw new Error('Database schema is newer than this host')
    for (let i=version; i<migrations.length; i++) {
      database.exec(migrations[i])
      database.run('INSERT INTO strata_migrations(version) VALUES(?)', i+1)
    }
  })
}
