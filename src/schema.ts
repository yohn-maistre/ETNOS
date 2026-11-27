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

export const migrations = [schema, `
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
`, `
ALTER TABLE posts ADD COLUMN content TEXT NOT NULL DEFAULT '{}';
ALTER TABLE posts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN updated INTEGER;
ALTER TABLE posts ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
CREATE TABLE poll_votes(post_id TEXT NOT NULL REFERENCES posts(id),actor_id TEXT NOT NULL REFERENCES actors(id),choice INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(post_id,actor_id));
CREATE TABLE event_responses(post_id TEXT NOT NULL REFERENCES posts(id),actor_id TEXT NOT NULL REFERENCES actors(id),response TEXT NOT NULL CHECK(response IN ('going','interested')),created INTEGER NOT NULL,PRIMARY KEY(post_id,actor_id));
CREATE TABLE moderation_events(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),post_id TEXT NOT NULL REFERENCES posts(id),actor_id TEXT NOT NULL REFERENCES actors(id),action TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX moderation_community ON moderation_events(community_id,created DESC);
CREATE TABLE post_requests(actor_id TEXT NOT NULL REFERENCES actors(id),request_key TEXT NOT NULL,digest TEXT NOT NULL,post_id TEXT NOT NULL REFERENCES posts(id),PRIMARY KEY(actor_id,request_key));
CREATE INDEX post_author_recent ON posts(author_id,created DESC);
`, `
CREATE TABLE follows(actor_id TEXT NOT NULL REFERENCES actors(id),target_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(actor_id,target_id),CHECK(actor_id!=target_id));
CREATE INDEX follows_target ON follows(target_id,actor_id);
`, `
ALTER TABLE wiki_pages ADD COLUMN draft INTEGER NOT NULL DEFAULT 0;
CREATE TABLE wiki_policies(community_id TEXT PRIMARY KEY REFERENCES communities(id),contributor_group_id TEXT REFERENCES groups(id),reviewer_group_id TEXT REFERENCES groups(id));
CREATE TABLE wiki_requests(actor_id TEXT NOT NULL REFERENCES actors(id),request_key TEXT NOT NULL,digest TEXT NOT NULL,page_id TEXT NOT NULL REFERENCES wiki_pages(id),PRIMARY KEY(actor_id,request_key));
CREATE TABLE actor_profiles(actor_id TEXT PRIMARY KEY REFERENCES actors(id),bio TEXT NOT NULL,website TEXT NOT NULL,location TEXT NOT NULL);
`, `
CREATE TABLE decision_requests(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES actors(id),post_id TEXT NOT NULL REFERENCES posts(id),revision INTEGER NOT NULL,request_key TEXT NOT NULL,created INTEGER NOT NULL,state TEXT NOT NULL,digest TEXT,result TEXT,UNIQUE(actor_id,request_key));
CREATE INDEX decision_requests_budget ON decision_requests(created,actor_id);
`, `
CREATE TABLE agent_registrations(agent_id TEXT PRIMARY KEY REFERENCES actors(id),community_id TEXT NOT NULL REFERENCES communities(id),group_id TEXT REFERENCES groups(id),role TEXT NOT NULL CHECK(role IN ('guest','worker','steward')),family TEXT NOT NULL CHECK(family IN ('aksara','external')),created INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE agent_deployments(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES actors(id),label TEXT NOT NULL,jwk TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE,created INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE agent_tokens(hash TEXT PRIMARY KEY,deployment_id TEXT NOT NULL REFERENCES agent_deployments(id),scope TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE agent_assertions(deployment_id TEXT NOT NULL REFERENCES agent_deployments(id),jti TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(deployment_id,jti));
CREATE TABLE agent_auth_attempts(id TEXT PRIMARY KEY,deployment_id TEXT NOT NULL REFERENCES agent_deployments(id),created INTEGER NOT NULL);
CREATE INDEX agent_deployments_actor ON agent_deployments(agent_id);
CREATE INDEX agent_token_expiry ON agent_tokens(expires);
CREATE INDEX agent_attempt_time ON agent_auth_attempts(created);
CREATE TABLE agent_wiki_requests(agent_id TEXT NOT NULL REFERENCES actors(id),request_key TEXT NOT NULL,digest TEXT NOT NULL,proposal_id TEXT NOT NULL REFERENCES wiki_proposals(id),PRIMARY KEY(agent_id,request_key));
`, `
CREATE TABLE enrollment_invitations (
 id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, issuer_id TEXT NOT NULL REFERENCES actors(id),
 created INTEGER NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0,
 used_by TEXT REFERENCES actors(id), used_at INTEGER
);
`, `
CREATE TABLE commons_receipts (
 actor_id TEXT NOT NULL REFERENCES actors(id), request_key TEXT NOT NULL, action TEXT NOT NULL,
 digest TEXT NOT NULL, result TEXT NOT NULL, created INTEGER NOT NULL,
 PRIMARY KEY(actor_id,request_key)
);
CREATE TABLE commons_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, community_id TEXT NOT NULL REFERENCES communities(id),
 actor_id TEXT NOT NULL REFERENCES actors(id), kind TEXT NOT NULL, artifact_kind TEXT NOT NULL,
 artifact_id TEXT NOT NULL, revision INTEGER NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX commons_events_scope ON commons_events(community_id,sequence DESC);
`, `
CREATE TABLE discovery_sources (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), owner_id TEXT NOT NULL REFERENCES actors(id),
 title TEXT NOT NULL, url TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('news','reference')),
 language TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('index','review','news')),
 rights TEXT NOT NULL CHECK(rights IN ('link-only','excerpt-permitted','open')),
 terms_url TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('active','paused','withdrawn')),
 revision INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
 last_attempt INTEGER, last_success INTEGER, last_error TEXT,
 UNIQUE(community_id,url)
);
CREATE TABLE discovery_attempts (
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES discovery_sources(id), source_revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL REFERENCES actors(id), created INTEGER NOT NULL, state TEXT NOT NULL,
 digest TEXT, item_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX discovery_attempts_rate ON discovery_attempts(source_id,created DESC);
CREATE TABLE discovery_items (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), url TEXT NOT NULL,
 title TEXT NOT NULL, summary TEXT NOT NULL, published INTEGER, language TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('candidate','published','withdrawn')),
 revision INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
 reviewer_id TEXT REFERENCES actors(id), UNIQUE(community_id,url)
);
CREATE TABLE discovery_evidence (
 item_id TEXT NOT NULL REFERENCES discovery_items(id), source_id TEXT NOT NULL REFERENCES discovery_sources(id),
 source_revision INTEGER NOT NULL, digest TEXT NOT NULL, observed INTEGER NOT NULL,
 PRIMARY KEY(item_id,source_id)
);
CREATE INDEX discovery_items_scope ON discovery_items(community_id,updated DESC,id DESC);
`, `
CREATE TABLE knowledge_notes (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), author_id TEXT NOT NULL REFERENCES actors(id),
 title TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('note','question','memory','source-comparison')),
 citations TEXT NOT NULL, language TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('working','promoted','withdrawn')),
 revision INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
 editorial_mandate_id TEXT REFERENCES editorial_mandates(id), wiki_page_id TEXT REFERENCES wiki_pages(id)
);
CREATE TABLE knowledge_history (
 id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES knowledge_notes(id), revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL REFERENCES actors(id), title TEXT NOT NULL, text TEXT NOT NULL, citations TEXT NOT NULL,
 kind TEXT NOT NULL, language TEXT NOT NULL, state TEXT NOT NULL, created INTEGER NOT NULL,
 UNIQUE(note_id,revision)
);
CREATE TABLE knowledge_evidence (
 note_id TEXT NOT NULL REFERENCES knowledge_notes(id), item_id TEXT NOT NULL REFERENCES discovery_items(id),
 item_revision INTEGER NOT NULL, PRIMARY KEY(note_id,item_id)
);
CREATE INDEX knowledge_scope ON knowledge_notes(community_id,updated DESC,id DESC);
`, `
CREATE TABLE resident_configs (
 community_id TEXT PRIMARY KEY REFERENCES communities(id), agent_id TEXT NOT NULL REFERENCES actors(id),
 operator_id TEXT NOT NULL REFERENCES actors(id), posting_mandate_id TEXT REFERENCES mandates(id),
 editorial_mandate_id TEXT REFERENCES editorial_mandates(id), enabled INTEGER NOT NULL,
 revision INTEGER NOT NULL, daily_limit INTEGER NOT NULL, interval_minutes INTEGER NOT NULL,
 next_run INTEGER, updated INTEGER NOT NULL
);
CREATE TABLE resident_jobs (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), agent_id TEXT NOT NULL REFERENCES actors(id),
 operator_id TEXT NOT NULL REFERENCES actors(id), config_revision INTEGER NOT NULL,
 skill TEXT NOT NULL CHECK(skill IN ('source-digest','research-question','knowledge-draft')),
 request_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL CHECK(state IN ('queued','running','succeeded','abstained','failed','cancelled')),
 generation INTEGER NOT NULL, lease_until INTEGER, checkpoint TEXT NOT NULL, evidence TEXT NOT NULL,
 result_kind TEXT, result_id TEXT, error TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL,
 model TEXT, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX resident_jobs_ready ON resident_jobs(state,created);
CREATE INDEX resident_jobs_budget ON resident_jobs(community_id,created DESC);
CREATE INDEX discovery_sources_due ON discovery_sources(state,last_attempt);
`, `
CREATE TABLE community_context_epochs(community_id TEXT PRIMARY KEY REFERENCES communities(id),epoch INTEGER NOT NULL);
ALTER TABLE resident_configs ADD COLUMN mentions_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resident_jobs ADD COLUMN runtime_ticket_hash TEXT;
ALTER TABLE resident_jobs ADD COLUMN context_epoch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resident_jobs ADD COLUMN trigger_post_id TEXT REFERENCES posts(id);
ALTER TABLE resident_jobs ADD COLUMN requester_id TEXT REFERENCES actors(id);
CREATE TABLE resident_inference_calls(
 id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES resident_jobs(id),generation INTEGER NOT NULL,
 request_key TEXT NOT NULL,created INTEGER NOT NULL,state TEXT NOT NULL,
 UNIQUE(job_id,generation,request_key)
);
CREATE INDEX resident_inference_budget ON resident_inference_calls(created,job_id);
`, `
CREATE TABLE clustering_runs(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),operator_id TEXT NOT NULL REFERENCES actors(id),read_set_hash TEXT NOT NULL,receipt TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE clustering_assignments(run_id TEXT NOT NULL REFERENCES clustering_runs(id),item_id TEXT NOT NULL REFERENCES discovery_items(id),item_revision INTEGER NOT NULL,label INTEGER NOT NULL,distance REAL NOT NULL,PRIMARY KEY(run_id,item_id));
CREATE INDEX clustering_scope ON clustering_runs(community_id,created DESC,id DESC);
ALTER TABLE resident_configs ADD COLUMN announce_knowledge INTEGER NOT NULL DEFAULT 0;
CREATE TABLE knowledge_announcements(note_id TEXT NOT NULL REFERENCES knowledge_notes(id),revision INTEGER NOT NULL,community_id TEXT NOT NULL REFERENCES communities(id),post_id TEXT NOT NULL UNIQUE REFERENCES posts(id),created INTEGER NOT NULL,PRIMARY KEY(note_id,revision,community_id));
`, `
CREATE TABLE offerings(post_id TEXT PRIMARY KEY REFERENCES posts(id),kind TEXT NOT NULL CHECK(kind IN ('offer','request')),price INTEGER CHECK(price IS NULL OR price>=0),unit TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('open','paused','fulfilled','withdrawn')),expires INTEGER,place_context_id TEXT REFERENCES contexts(id),revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX offerings_active ON offerings(status,created DESC,post_id DESC);
CREATE TABLE offering_history(post_id TEXT NOT NULL REFERENCES offerings(post_id),revision INTEGER NOT NULL,actor_id TEXT NOT NULL REFERENCES actors(id),snapshot TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(post_id,revision));
`, `
CREATE TABLE resident_sitewide(id INTEGER PRIMARY KEY CHECK(id=1),agent_id TEXT NOT NULL REFERENCES actors(id),home_community_id TEXT NOT NULL REFERENCES communities(id),operator_id TEXT NOT NULL REFERENCES actors(id),enabled INTEGER NOT NULL,coverage TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
ALTER TABLE resident_jobs ADD COLUMN work_kind TEXT NOT NULL DEFAULT 'editorial' CHECK(work_kind IN ('editorial','thread-reply'));
ALTER TABLE resident_jobs ADD COLUMN inference_started INTEGER NOT NULL DEFAULT 0 CHECK(inference_started IN(0,1));
ALTER TABLE resident_jobs ADD COLUMN inference_started_at INTEGER;
UPDATE resident_jobs SET inference_started=1,inference_started_at=updated WHERE model IS NOT NULL AND model NOT LIKE 'model-free:%';
CREATE INDEX resident_model_budget ON resident_jobs(inference_started_at);
CREATE TABLE resident_destinations(agent_id TEXT NOT NULL REFERENCES actors(id),community_id TEXT NOT NULL REFERENCES communities(id),posting_mandate_id TEXT NOT NULL REFERENCES mandates(id),enabled INTEGER NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(agent_id,community_id));
CREATE TABLE resident_job_inputs(job_id TEXT PRIMARY KEY REFERENCES resident_jobs(id),config_community_id TEXT NOT NULL REFERENCES communities(id),target_post_id TEXT NOT NULL UNIQUE REFERENCES posts(id),target_revision INTEGER NOT NULL,target_digest TEXT NOT NULL,snapshot TEXT NOT NULL,posting_mandate_id TEXT NOT NULL REFERENCES mandates(id),global_revision INTEGER NOT NULL,route_revision INTEGER NOT NULL,coverage TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX resident_request_budget ON resident_jobs(requester_id,created);
CREATE INDEX resident_actor_budget ON resident_jobs(agent_id,created);
`, `
CREATE TABLE resident_tool_calls(id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES resident_jobs(id),generation INTEGER NOT NULL,tool TEXT NOT NULL CHECK(tool IN ('search_reviewed_wiki','web_search','web_fetch')),request_key TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('reserved','observed')),created INTEGER NOT NULL,UNIQUE(job_id,generation,request_key));
CREATE INDEX resident_tool_budget ON resident_tool_calls(created,tool);
CREATE TABLE resident_job_citations(job_id TEXT NOT NULL REFERENCES resident_jobs(id),generation INTEGER NOT NULL,url TEXT NOT NULL,origin TEXT NOT NULL CHECK(origin IN ('wiki','web')),title TEXT NOT NULL,call_id TEXT NOT NULL REFERENCES resident_tool_calls(id),created INTEGER NOT NULL,PRIMARY KEY(job_id,generation,url));
`, `
CREATE TABLE context_parents(context_id TEXT NOT NULL REFERENCES contexts(id),parent_id TEXT NOT NULL REFERENCES contexts(id),issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(context_id,parent_id),CHECK(context_id<>parent_id));
CREATE INDEX context_children ON context_parents(parent_id,context_id);
ALTER TABLE contexts ADD COLUMN facet TEXT NOT NULL DEFAULT '';
`, `
CREATE TABLE community_contexts(community_id TEXT NOT NULL REFERENCES communities(id),context_id TEXT NOT NULL REFERENCES contexts(id),issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(community_id,context_id));
CREATE INDEX community_context_lookup ON community_contexts(context_id,community_id);
`,`
CREATE TABLE record_times(record_kind TEXT NOT NULL CHECK(record_kind IN ('wiki')),record_id TEXT NOT NULL,from_year INTEGER NOT NULL,to_year INTEGER NOT NULL,precision TEXT NOT NULL CHECK(precision IN ('year','decade','century','millennium','deep')),note TEXT NOT NULL,issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(record_kind,record_id));
CREATE INDEX record_time_order ON record_times(record_kind,from_year);
`,`
CREATE TABLE desk_shelf(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),added_by TEXT NOT NULL REFERENCES actors(id),title TEXT NOT NULL,url TEXT NOT NULL,holder TEXT NOT NULL,text TEXT NOT NULL,digest TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('proposed','accepted','withdrawn')),created INTEGER NOT NULL,UNIQUE(community_id,digest));
CREATE TABLE desk_drafts(id TEXT PRIMARY KEY,shelf_id TEXT NOT NULL REFERENCES desk_shelf(id),community_id TEXT NOT NULL REFERENCES communities(id),agent_id TEXT NOT NULL REFERENCES actors(id),request_key TEXT NOT NULL,kind TEXT NOT NULL,facts TEXT NOT NULL,dropped TEXT NOT NULL,draft TEXT NOT NULL,checks TEXT NOT NULL,model TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('pending','draft','failed','released','rejected')),created INTEGER NOT NULL,UNIQUE(agent_id,request_key));
CREATE INDEX desk_draft_queue ON desk_drafts(community_id,created);
`,`
ALTER TABLE wiki_proposals ADD COLUMN basis TEXT;
`,`
CREATE TABLE agent_switches(agent_id TEXT NOT NULL REFERENCES actors(id),community_id TEXT NOT NULL REFERENCES communities(id),issuer_id TEXT NOT NULL REFERENCES actors(id),posts INTEGER NOT NULL,wiki INTEGER NOT NULL,daily_limit INTEGER NOT NULL,enabled INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(agent_id,community_id));
`,`
ALTER TABLE wiki_policies ADD COLUMN live INTEGER NOT NULL DEFAULT 0;
CREATE TABLE wiki_reviews(revision_id TEXT PRIMARY KEY REFERENCES wiki_revisions(id),page_id TEXT NOT NULL REFERENCES wiki_pages(id),community_id TEXT NOT NULL REFERENCES communities(id),state TEXT NOT NULL CHECK(state IN ('unreviewed','reviewed','reverted')),reviewer_id TEXT REFERENCES actors(id),created INTEGER NOT NULL,decided INTEGER);
CREATE INDEX wiki_review_queue ON wiki_reviews(community_id,state,created);
`,`
CREATE INDEX IF NOT EXISTS memberships_actor ON memberships(actor_id,active,community_id);
`, `
CREATE TABLE post_confirmations(post_id TEXT NOT NULL REFERENCES posts(id),actor_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(post_id,actor_id));
`, `
CREATE TABLE community_seasons(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),name TEXT NOT NULL,note TEXT NOT NULL,position INTEGER NOT NULL,archived INTEGER NOT NULL DEFAULT 0,issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX community_season_order ON community_seasons(community_id,archived,position);
`, `
ALTER TABLE communities ADD COLUMN forming_until INTEGER;
ALTER TABLE communities ADD COLUMN founding_visibility TEXT CHECK(founding_visibility IN ('public','listed-private','hidden-private'));
ALTER TABLE communities ADD COLUMN founding_admission TEXT CHECK(founding_admission IN ('open','approval','invite'));
CREATE TABLE founding_links(hash TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
CREATE INDEX founding_link_community ON founding_links(community_id);
`, `
CREATE TABLE km_entities(slug TEXT PRIMARY KEY,class TEXT NOT NULL CHECK(class IN ('tempat','makhluk','kelompok','lembaga','orang','benda','bahasa','gagasan','praktik','peristiwa','musim','cerita')),title TEXT NOT NULL,description TEXT NOT NULL,aliases TEXT NOT NULL,context_slug TEXT,community_id TEXT REFERENCES communities(id),state TEXT NOT NULL CHECK(state IN ('proposed','accepted','rejected','merged')),merged_into TEXT REFERENCES km_entities(slug),origin TEXT NOT NULL,proposer_id TEXT REFERENCES actors(id),reviewer_id TEXT REFERENCES actors(id),revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX km_entities_state ON km_entities(state,community_id);
CREATE TABLE km_witnesses(id TEXT PRIMARY KEY,key TEXT NOT NULL UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('document','recording','tuturan','measurement','paper','post','derived')),title TEXT NOT NULL,url TEXT,publisher TEXT NOT NULL,licence TEXT,year INTEGER,language TEXT,voice TEXT NOT NULL,community_id TEXT REFERENCES communities(id),post_id TEXT REFERENCES posts(id),post_revision INTEGER,state TEXT NOT NULL CHECK(state IN ('active','withdrawn')),withdrawn_reason TEXT,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE km_excerpts(id TEXT PRIMARY KEY,witness_id TEXT NOT NULL REFERENCES km_witnesses(id),digest TEXT NOT NULL,text TEXT NOT NULL,section TEXT NOT NULL,UNIQUE(witness_id,digest));
CREATE TABLE km_mentions(entity TEXT NOT NULL REFERENCES km_entities(slug),excerpt_id TEXT NOT NULL REFERENCES km_excerpts(id),surface TEXT NOT NULL,PRIMARY KEY(entity,excerpt_id));
CREATE TABLE km_assertions(id TEXT PRIMARY KEY,subject TEXT NOT NULL REFERENCES km_entities(slug),predicate TEXT NOT NULL,object TEXT REFERENCES km_entities(slug),value TEXT,qualifiers TEXT NOT NULL,layer TEXT NOT NULL CHECK(layer IN ('jejak','tuturan','tafsir')),status TEXT NOT NULL CHECK(status IN ('proposed','accepted','rejected','withdrawn')),logical TEXT NOT NULL CHECK(logical IN ('undisputed','disputed','settled','superseded')),rank TEXT NOT NULL CHECK(rank IN ('preferred','normal','variant','deprecated')),visibility TEXT NOT NULL CHECK(visibility IN ('public','community')),train INTEGER NOT NULL DEFAULT 0,community_id TEXT REFERENCES communities(id),origin TEXT NOT NULL,proposer_id TEXT REFERENCES actors(id),reviewer_id TEXT REFERENCES actors(id),review_note TEXT,digest TEXT NOT NULL UNIQUE,revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX km_assertions_status ON km_assertions(status,community_id);
CREATE TABLE km_support(assertion_id TEXT NOT NULL REFERENCES km_assertions(id),excerpt_id TEXT NOT NULL REFERENCES km_excerpts(id),PRIMARY KEY(assertion_id,excerpt_id));
`,`
CREATE TABLE claims(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),kind TEXT NOT NULL CHECK(kind IN ('word','sense','grammar','name','place','date','wiki','other')),subject TEXT NOT NULL,statement TEXT NOT NULL,evidence TEXT NOT NULL,proposer_id TEXT NOT NULL REFERENCES actors(id),parent_id TEXT REFERENCES claims(id),state TEXT NOT NULL CHECK(state IN ('open','checked','rejected','split','withdrawn')),created INTEGER NOT NULL,settled INTEGER);
CREATE INDEX claims_queue ON claims(community_id,state,created);
CREATE TABLE claim_answers(claim_id TEXT NOT NULL REFERENCES claims(id),actor_id TEXT NOT NULL REFERENCES actors(id),answer TEXT NOT NULL CHECK(answer IN ('yes','no')),created INTEGER NOT NULL,PRIMARY KEY(claim_id,actor_id));
CREATE TABLE claim_settings(community_id TEXT PRIMARY KEY REFERENCES communities(id),quorum INTEGER NOT NULL CHECK(quorum BETWEEN 1 AND 9));
`, `
CREATE TABLE work_posts(
 post_id TEXT PRIMARY KEY REFERENCES posts(id),
 work_id TEXT UNIQUE REFERENCES public_work(id),
 group_id TEXT NOT NULL REFERENCES groups(id),
 requested_of TEXT REFERENCES groups(id),
 status TEXT NOT NULL CHECK(status IN ('diusulkan','dikerjakan','selesai','ditarik')),
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL
);
CREATE INDEX work_posts_group ON work_posts(group_id,status);
CREATE TABLE aksara_requests(
 id TEXT PRIMARY KEY,
 requester_group_id TEXT NOT NULL REFERENCES groups(id),
 target_group_id TEXT NOT NULL REFERENCES groups(id),
 post_id TEXT NOT NULL REFERENCES posts(id),
 agent_id TEXT NOT NULL REFERENCES actors(id),
 state TEXT NOT NULL CHECK(state IN ('pending','approved','declined','withdrawn')),
 decided_by TEXT REFERENCES actors(id),
 decided INTEGER,
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL,
 UNIQUE(post_id,target_group_id)
);
CREATE INDEX aksara_requests_target ON aksara_requests(target_group_id,state,created DESC);
CREATE INDEX aksara_requests_requester ON aksara_requests(requester_group_id,created DESC);
INSERT INTO posts(id,author_id,community_id,parent_id,text,created,hidden,root_id,content,updated)
 SELECT w.id,(SELECT e.actor_id FROM work_events e WHERE e.work_id=w.id ORDER BY e.created,e.rowid LIMIT 1),w.community_id,NULL,w.description,w.created,0,w.id,json_object('title',w.title),w.updated
 FROM public_work w WHERE EXISTS(SELECT 1 FROM work_events e WHERE e.work_id=w.id) AND NOT EXISTS(SELECT 1 FROM posts p WHERE p.id=w.id);
INSERT INTO work_posts(post_id,work_id,group_id,requested_of,status,created,updated)
 SELECT w.id,w.id,w.group_id,NULL,CASE w.state WHEN 'completed' THEN 'selesai' WHEN 'active' THEN 'dikerjakan' WHEN 'blocked' THEN 'dikerjakan' WHEN 'withdrawn' THEN 'ditarik' ELSE 'diusulkan' END,w.created,w.updated
 FROM public_work w WHERE EXISTS(SELECT 1 FROM posts p WHERE p.id=w.id);
`,`
CREATE TABLE kamus_settings(community_id TEXT PRIMARY KEY REFERENCES communities(id),machine_reading INTEGER NOT NULL DEFAULT 0,language TEXT NOT NULL DEFAULT '',updated INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES actors(id));
CREATE TABLE kamus_entries(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),lemma TEXT NOT NULL,norm TEXT NOT NULL,gloss TEXT NOT NULL,pos TEXT NOT NULL,context TEXT NOT NULL,source TEXT NOT NULL,licence TEXT NOT NULL,page INTEGER,state TEXT NOT NULL CHECK(state IN ('seed','candidate','proposed')),claim_id TEXT REFERENCES claims(id),uses INTEGER NOT NULL,speakers INTEGER NOT NULL,examples TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX kamus_entries_norm ON kamus_entries(community_id,norm);
`,`
CREATE TABLE km_coordinates(slug TEXT PRIMARY KEY REFERENCES km_entities(slug),size_lo REAL,size_hi REAL,size_basis TEXT CHECK(size_basis IN ('rule','model','measurement','person')),size_note TEXT,pace_lo REAL,pace_hi REAL,pace_basis TEXT CHECK(pace_basis IN ('rule','model','measurement','person')),pace_note TEXT,level TEXT CHECK(level IS NULL OR (length(level)=1 AND level BETWEEN 'a' AND 'y')),level_basis TEXT CHECK(level_basis IN ('rule','model','measurement','person')),level_note TEXT,actor_id TEXT REFERENCES actors(id),revision INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE km_depth(assertion_id TEXT PRIMARY KEY REFERENCES km_assertions(id),depth TEXT CHECK(depth IS NULL OR depth IN ('apa','cara','aturan','makna')),basis TEXT NOT NULL CHECK(basis IN ('rule','model','person')),actor_id TEXT REFERENCES actors(id),updated INTEGER NOT NULL);
CREATE TABLE datasets(id TEXT PRIMARY KEY,key TEXT NOT NULL UNIQUE,title TEXT NOT NULL,description TEXT NOT NULL,kind TEXT NOT NULL,publisher TEXT NOT NULL,publisher_url TEXT,landing_page TEXT NOT NULL,licence TEXT NOT NULL,licence_url TEXT,issued TEXT,modified TEXT,version TEXT,languages TEXT NOT NULL,keywords TEXT NOT NULL,temporal TEXT,spatial TEXT,distributions TEXT NOT NULL,structure TEXT NOT NULL,citation TEXT,access_tier TEXT NOT NULL CHECK(access_tier IN ('open','community','controlled')),state TEXT NOT NULL CHECK(state IN ('proposed','accepted','rejected','withdrawn')),origin TEXT NOT NULL,checked TEXT,proposer_id TEXT NOT NULL REFERENCES actors(id),reviewer_id TEXT REFERENCES actors(id),revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX datasets_state ON datasets(state,updated);
CREATE TABLE dataset_about(dataset_id TEXT NOT NULL REFERENCES datasets(id),entity TEXT NOT NULL REFERENCES km_entities(slug),PRIMARY KEY(dataset_id,entity));
CREATE INDEX dataset_about_entity ON dataset_about(entity);
`,`
ALTER TABLE kamus_settings ADD COLUMN suffixes TEXT;
ALTER TABLE kamus_entries ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
ALTER TABLE kamus_entries ADD COLUMN definition TEXT NOT NULL DEFAULT '';
ALTER TABLE kamus_entries ADD COLUMN dialect TEXT NOT NULL DEFAULT '';
ALTER TABLE kamus_entries ADD COLUMN sensitive INTEGER NOT NULL DEFAULT 0;
ALTER TABLE claims ADD COLUMN origin TEXT NOT NULL DEFAULT 'member';
CREATE TABLE kamus_questions(id TEXT PRIMARY KEY,community_id TEXT NOT NULL REFERENCES communities(id),key TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('stem','align','concept','picture')),form TEXT NOT NULL,entry_id TEXT REFERENCES kamus_entries(id),stem TEXT NOT NULL DEFAULT '',suffix TEXT NOT NULL DEFAULT '',gloss TEXT NOT NULL DEFAULT '',word_class TEXT NOT NULL DEFAULT '',subject TEXT NOT NULL DEFAULT '',claim_id TEXT NOT NULL UNIQUE REFERENCES claims(id),created INTEGER NOT NULL,UNIQUE(community_id,key));
CREATE INDEX kamus_questions_kind ON kamus_questions(community_id,kind,subject);
CREATE TABLE kamus_answers_skipped(actor_id TEXT NOT NULL REFERENCES actors(id),community_id TEXT NOT NULL REFERENCES communities(id),key TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(actor_id,community_id,key));
CREATE TABLE kamus_mine(actor_id TEXT NOT NULL REFERENCES actors(id),community_id TEXT NOT NULL REFERENCES communities(id),norm TEXT NOT NULL,form TEXT NOT NULL,gloss TEXT NOT NULL DEFAULT '',word_class TEXT NOT NULL DEFAULT '',post_id TEXT REFERENCES posts(id),saved INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(actor_id,community_id,norm));
CREATE TABLE kamus_classes(community_id TEXT NOT NULL REFERENCES communities(id),norm TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES actors(id),word_class TEXT NOT NULL CHECK(word_class IN ('benda','kerja','sifat','lainnya')),created INTEGER NOT NULL,PRIMARY KEY(community_id,norm,actor_id));
CREATE TABLE kamus_artinya(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES posts(id),community_id TEXT NOT NULL REFERENCES communities(id),author_id TEXT NOT NULL REFERENCES actors(id),text TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(post_id,author_id));
CREATE INDEX kamus_artinya_community ON kamus_artinya(community_id,created);
`,`
ALTER TABLE community_contexts ADD COLUMN role TEXT NOT NULL DEFAULT 'about' CHECK(role IN ('about','language'));
UPDATE community_contexts SET role='language' WHERE context_id IN (SELECT id FROM contexts WHERE kind='language');
CREATE TABLE lembaga_profiles(group_id TEXT PRIMARY KEY REFERENCES groups(id),about TEXT NOT NULL DEFAULT '',contacts TEXT NOT NULL DEFAULT '[]',website TEXT NOT NULL DEFAULT '',recognition TEXT NOT NULL DEFAULT '[]',hide_count INTEGER NOT NULL DEFAULT 0,logo BLOB,updated INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES actors(id));
CREATE TABLE entry_listings(slug TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,jenis_context_id TEXT REFERENCES contexts(id),place_context_id TEXT REFERENCES contexts(id),created_by TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL);
CREATE TABLE entry_claims(id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES groups(id),entry_slug TEXT,proposal TEXT,state TEXT NOT NULL CHECK(state IN ('pending','approved','declined','withdrawn','released')),requested_by TEXT NOT NULL REFERENCES actors(id),decided_by TEXT REFERENCES actors(id),created INTEGER NOT NULL,decided INTEGER,CHECK(entry_slug IS NOT NULL OR proposal IS NOT NULL));
CREATE UNIQUE INDEX entry_claims_one_per_entry ON entry_claims(entry_slug) WHERE state='approved';
CREATE UNIQUE INDEX entry_claims_one_per_group ON entry_claims(group_id) WHERE state='approved';
CREATE UNIQUE INDEX entry_claims_one_pending ON entry_claims(group_id) WHERE state='pending';
CREATE TABLE kios(owner_kind TEXT NOT NULL CHECK(owner_kind IN ('actor','group')),owner_id TEXT NOT NULL,open INTEGER NOT NULL,whatsapp TEXT NOT NULL DEFAULT '',rules TEXT NOT NULL,updated INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES actors(id),PRIMARY KEY(owner_kind,owner_id));
CREATE INDEX offerings_place ON offerings(place_context_id,status);
`,`
CREATE TABLE post_entries(post_id TEXT NOT NULL REFERENCES posts(id),slug TEXT NOT NULL,title TEXT NOT NULL,label TEXT NOT NULL,issuer_id TEXT NOT NULL REFERENCES actors(id),created INTEGER NOT NULL,PRIMARY KEY(post_id,slug));
CREATE INDEX post_entries_slug ON post_entries(slug,post_id);
`,`
ALTER TABLE lembaga_profiles ADD COLUMN cover TEXT;
ALTER TABLE lembaga_profiles ADD COLUMN communities TEXT;
CREATE TABLE situs(group_id TEXT PRIMARY KEY REFERENCES groups(id),name TEXT NOT NULL UNIQUE,draft TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 0,activated_by TEXT REFERENCES actors(id),activated INTEGER,published INTEGER,updated INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES actors(id));
CREATE TABLE situs_versions(group_id TEXT NOT NULL REFERENCES groups(id),version INTEGER NOT NULL,name TEXT NOT NULL,situs TEXT NOT NULL,lembaga TEXT NOT NULL,snapshot TEXT NOT NULL,created INTEGER NOT NULL,created_by TEXT NOT NULL REFERENCES actors(id),PRIMARY KEY(group_id,version));
CREATE TABLE deployment_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES actors(id));
`,`
ALTER TABLE resident_jobs ADD COLUMN program TEXT;
CREATE TABLE aksara_research_log(community_id TEXT NOT NULL REFERENCES communities(id),target_slug TEXT NOT NULL,status TEXT NOT NULL,page_id TEXT REFERENCES wiki_pages(id),attempted INTEGER NOT NULL,PRIMARY KEY(community_id,target_slug));
CREATE INDEX aksara_research_community ON aksara_research_log(community_id,attempted DESC);
`,`
CREATE TABLE voice_clips(
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES actors(id),
 community_id TEXT NOT NULL REFERENCES communities(id),
 post_id TEXT REFERENCES posts(id),
 kamus_norm TEXT,
 bytes BLOB,
 r2_key TEXT,
 mime TEXT NOT NULL,
 size INTEGER NOT NULL,
 duration_ms INTEGER NOT NULL,
 peaks TEXT NOT NULL DEFAULT '[]',
 speaker TEXT NOT NULL DEFAULT '',
 language TEXT NOT NULL DEFAULT '',
 transcript TEXT NOT NULL DEFAULT '',
 consent_public INTEGER NOT NULL DEFAULT 0,
 protocol TEXT NOT NULL DEFAULT 'community' CHECK(protocol IN ('community','public','restricted')),
 created INTEGER NOT NULL
);
CREATE INDEX voice_clips_post ON voice_clips(post_id,created);
CREATE INDEX voice_clips_kamus ON voice_clips(community_id,kamus_norm,created DESC);
CREATE INDEX voice_clips_owner ON voice_clips(owner_id,created DESC);
`,`
CREATE TABLE community_at_spaces(
 community_id TEXT PRIMARY KEY REFERENCES communities(id),
 space_uri TEXT NOT NULL,
 authority_did TEXT NOT NULL,
 host_origin TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('active','paused','revoked')),
 created_by TEXT NOT NULL REFERENCES actors(id),
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL
);
CREATE TABLE community_at_space_members(
 community_id TEXT NOT NULL REFERENCES communities(id),
 actor_id TEXT NOT NULL REFERENCES actors(id),
 member_did TEXT NOT NULL,
 role TEXT NOT NULL,
 synced INTEGER NOT NULL,
 revoked INTEGER,
 PRIMARY KEY(community_id,actor_id)
);
CREATE INDEX community_at_space_members_did ON community_at_space_members(community_id,revoked);
`,`
CREATE TABLE captures_3d(
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES actors(id),
 community_id TEXT NOT NULL REFERENCES communities(id),
 entry_slug TEXT,
 title TEXT NOT NULL,
 summary TEXT NOT NULL DEFAULT '',
 format TEXT NOT NULL CHECK(format IN ('spz','ply','glb','video-job')),
 state TEXT NOT NULL CHECK(state IN ('queued','processing','ready','failed')),
 splat_count INTEGER NOT NULL DEFAULT 0,
 bytes BLOB,
 r2_key TEXT,
 size INTEGER NOT NULL DEFAULT 0,
 source_video_url TEXT,
 error TEXT,
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL
);
CREATE INDEX captures_3d_community ON captures_3d(community_id,state,created DESC);
CREATE INDEX captures_3d_entry ON captures_3d(entry_slug,state);
CREATE TABLE capture_pins(
 id TEXT PRIMARY KEY,
 target_id TEXT NOT NULL,
 community_id TEXT REFERENCES communities(id),
 author_id TEXT NOT NULL REFERENCES actors(id),
 x REAL NOT NULL,
 y REAL NOT NULL,
 z REAL NOT NULL,
 label TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 kamus_word TEXT NOT NULL DEFAULT '',
 voice_clip_id TEXT REFERENCES voice_clips(id),
 created INTEGER NOT NULL
);
CREATE INDEX capture_pins_target ON capture_pins(target_id,created ASC);
`, `
CREATE TABLE saluran_settings(
 community_id TEXT PRIMARY KEY REFERENCES communities(id),
 plant_id INTEGER NOT NULL DEFAULT 0,
 kurasi_balik INTEGER NOT NULL DEFAULT 0,
 updated INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES actors(id)
);
CREATE TABLE museum_annotations(
 id TEXT PRIMARY KEY,
 community_id TEXT NOT NULL REFERENCES communities(id),
 target_uri TEXT NOT NULL,
 target_label TEXT NOT NULL,
 author_id TEXT NOT NULL REFERENCES actors(id),
 body TEXT NOT NULL,
 local_name TEXT NOT NULL DEFAULT '',
 language TEXT NOT NULL DEFAULT '',
 licence TEXT NOT NULL DEFAULT 'CC BY 4.0',
 state TEXT NOT NULL CHECK(state IN ('active','withdrawn')) DEFAULT 'active',
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL
);
CREATE INDEX museum_annotations_community ON museum_annotations(community_id,state,created DESC);
CREATE INDEX museum_annotations_target ON museum_annotations(target_uri,state);
`, `
CREATE INDEX IF NOT EXISTS posts_community_visible_created ON posts(community_id,hidden,deleted,created DESC,id DESC);
CREATE INDEX IF NOT EXISTS kamus_entries_public_lookup ON kamus_entries(community_id,sensitive,state,norm);
CREATE INDEX IF NOT EXISTS voice_clips_kamus_lookup ON voice_clips(community_id,kamus_norm,protocol);
`, `
ALTER TABLE communities ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
UPDATE communities SET title='Alun-Alun', description='Obrolan santai sehari-hari, cerita acak, dan sapaan warga Tanah Papua.', admission='open' WHERE id=(SELECT community_id FROM starter_spaces WHERE slug='square') AND visibility='public';
UPDATE communities SET title='Tanya & Bantu', description='Tanya apa saja, minta tolong, jelaskan sederhana (ELI5), dan berbagi pengalaman.', admission='open' WHERE id=(SELECT community_id FROM starter_spaces WHERE slug='questions') AND visibility='public';
UPDATE communities SET title='Kabar & Diskusi', description='Bahas berita hangat, kebijakan daerah, dan perkembangan terbaru di Tanah Papua.', admission='open' WHERE id=(SELECT community_id FROM starter_spaces WHERE slug='notices') AND visibility='public';
UPDATE communities SET archived=1 WHERE id=(SELECT community_id FROM starter_spaces WHERE slug='culture');
INSERT OR IGNORE INTO memberships(community_id,actor_id,role,active)
 SELECT ss.community_id, a.id, 'member', 1
 FROM starter_spaces ss
 JOIN communities c ON c.id=ss.community_id AND c.visibility='public' AND c.admission='open'
 CROSS JOIN actors a
 WHERE ss.slug='square' AND a.kind='human';
`, `
CREATE TABLE IF NOT EXISTS public_post_vectors(
  post_id TEXT PRIMARY KEY REFERENCES posts(id),
  community_id TEXT NOT NULL REFERENCES communities(id),
  vector BLOB NOT NULL,
  dims INTEGER NOT NULL,
  mode TEXT NOT NULL,
  topics TEXT NOT NULL DEFAULT '[]',
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS public_post_vectors_community ON public_post_vectors(community_id, updated DESC);
`, `
-- Plain wording for the starter spaces (docs/voice.md). Only rows that still carry the shipped text change.
UPDATE communities SET description='Tempat bercerita, bertanya kabar dan saling menyapa setiap hari.' WHERE description='Obrolan santai sehari-hari, cerita acak, dan sapaan warga Tanah Papua.';
UPDATE communities SET description='Tanya apa saja, minta tolong, minta penjelasan yang sederhana, dan berbagi pengalaman.' WHERE description='Tanya apa saja, minta tolong, jelaskan sederhana (ELI5), dan berbagi pengalaman.';
`, `
-- Private alpha (W1): invitation links with a use count, and requests for an invitation. Requests are
-- operator-only rows: no public route, search, count or export reads this table.
ALTER TABLE enrollment_invitations ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1;
ALTER TABLE enrollment_invitations ADD COLUMN uses INTEGER NOT NULL DEFAULT 0;
UPDATE enrollment_invitations SET uses=1 WHERE used_by IS NOT NULL;
CREATE TABLE IF NOT EXISTS enrollment_invitation_uses(
 invitation_id TEXT NOT NULL REFERENCES enrollment_invitations(id), actor_id TEXT NOT NULL REFERENCES actors(id),
 used_at INTEGER NOT NULL, PRIMARY KEY(invitation_id,actor_id)
);
CREATE TABLE IF NOT EXISTS invite_requests(
 id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, reason TEXT NOT NULL,
 created INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved')),
 decided INTEGER, invitation_id TEXT REFERENCES enrollment_invitations(id), claim_hash TEXT, sealed_invitation TEXT
);
CREATE INDEX IF NOT EXISTS invite_requests_state ON invite_requests(state, created DESC);
CREATE TABLE IF NOT EXISTS invite_request_buckets(key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
`, `
-- Push notifications (W1, src/push.ts). A subscription belongs to a person or to an invitation request. The
-- triggers only queue a row for someone who has a subscription; the alarm checks access again before sending.
CREATE TABLE IF NOT EXISTS push_subscriptions(
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES actors(id), request_id TEXT,
 endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL,
 CHECK((actor_id IS NULL)<>(request_id IS NULL))
);
CREATE INDEX IF NOT EXISTS push_subscriptions_actor ON push_subscriptions(actor_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_request ON push_subscriptions(request_id);
CREATE TABLE IF NOT EXISTS push_outbox(
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT, request_id TEXT, kind TEXT NOT NULL, target TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS push_outbox_once ON push_outbox(COALESCE(actor_id,''),COALESCE(request_id,''),kind,target);
CREATE TRIGGER IF NOT EXISTS push_reply AFTER INSERT ON posts WHEN NEW.parent_id IS NOT NULL BEGIN
 INSERT OR IGNORE INTO push_outbox(actor_id,kind,target,created)
 SELECT p.author_id,'reply',NEW.id,NEW.created FROM posts p
 WHERE p.id=NEW.parent_id AND p.author_id<>NEW.author_id AND EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.actor_id=p.author_id);
END;
CREATE TRIGGER IF NOT EXISTS push_mention AFTER INSERT ON posts WHEN instr(NEW.text,'](/people/')>0 BEGIN
 INSERT OR IGNORE INTO push_outbox(actor_id,kind,target,created)
 SELECT DISTINCT s.actor_id,'mention',NEW.id,NEW.created FROM push_subscriptions s
 WHERE s.actor_id IS NOT NULL AND s.actor_id<>NEW.author_id AND instr(NEW.text,'](/people/'||s.actor_id||')')>0
  AND NOT EXISTS(SELECT 1 FROM posts p WHERE p.id=NEW.parent_id AND p.author_id=s.actor_id);
END;
CREATE TRIGGER IF NOT EXISTS push_kamus AFTER INSERT ON claims WHEN NEW.origin='member' AND json_valid(NEW.evidence) BEGIN
 INSERT OR IGNORE INTO push_outbox(actor_id,kind,target,created)
 SELECT p.author_id,'kamus',p.id,NEW.created FROM posts p
 WHERE p.id=json_extract(NEW.evidence,'$[0].postId') AND p.author_id<>NEW.proposer_id
  AND EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.actor_id=p.author_id);
END;
`, `
-- First-run screen (W1, src/first-run.ts): shown once per account. People who joined before it never see it.
CREATE TABLE IF NOT EXISTS first_run_done(actor_id TEXT PRIMARY KEY REFERENCES actors(id), done INTEGER NOT NULL);
INSERT OR IGNORE INTO first_run_done(actor_id,done) SELECT id,0 FROM actors WHERE kind='human';
`, `
-- Reports of profiles and communities for the node operator (W1, src/reports.ts). Post reports stay in reports.
CREATE TABLE IF NOT EXISTS operator_reports(
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('profile','community')), target_id TEXT NOT NULL,
 reporter_id TEXT NOT NULL REFERENCES actors(id), reason TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('open','resolved','dismissed')), decision TEXT, reviewer_id TEXT REFERENCES actors(id),
 created INTEGER NOT NULL, UNIQUE(kind,target_id,reporter_id)
);
CREATE INDEX IF NOT EXISTS operator_reports_state ON operator_reports(state, created DESC);
`, `
-- Local Contexts (src/local-contexts.ts): per shipped collection, a Local Contexts Hub project ID that the operator
-- links (communities apply their Labels there) and the Notices that the operator adds beside the shipped ones.
CREATE TABLE IF NOT EXISTS local_contexts_collections(
 collection TEXT PRIMARY KEY, project_id TEXT NOT NULL DEFAULT '', notices TEXT NOT NULL DEFAULT '[]',
 updated INTEGER NOT NULL, updated_by TEXT NOT NULL REFERENCES actors(id)
);
`]

export const schemaVersion=migrations.length


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
