export const schema = `
PRAGMA foreign_keys = ON;
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
PRAGMA user_version = 1;
`;
