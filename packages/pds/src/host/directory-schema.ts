// Copy of migrations/0001_directory.sql, kept identical by test/host-units.test.mjs.
// Inlined so the bundle stays one module on plain workerd.
export default `-- Strata identity host directory (D1). One row per account; status is the
-- authority the edge checks before waking any account object.
CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  did TEXT UNIQUE,
  signing_key TEXT,
  handle TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending','active','deactivated','takendown','deleting','deleted')),
  invite_hash TEXT NOT NULL UNIQUE,
  session_epoch INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS accounts_status ON accounts(status, did);

CREATE TABLE IF NOT EXISTS invites (
  hash TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  note TEXT,
  used_by TEXT,
  used_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT
);
`;
