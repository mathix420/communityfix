-- node_members invariants + one-time backfill from the legacy single-owner
-- model. Re-run safe: every statement is idempotent (DO/EXCEPTION on
-- constraints, IF NOT EXISTS on indexes, ON CONFLICT DO NOTHING on the
-- backfill), so it survives custom-migrations running on every db:migrate.

-- A membership targets exactly one node: an issue/solution or a case study,
-- never both and never neither. Drizzle's nullable FKs can't express
-- "exactly one of", so the polymorphic invariant lives here.
DO $$ BEGIN
  ALTER TABLE node_members ADD CONSTRAINT node_members_one_target_check
    CHECK (((issue_id IS NOT NULL)::int + (case_study_id IS NOT NULL)::int) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE node_members ADD CONSTRAINT node_members_target_kind_check
    CHECK (target_kind IN ('issue', 'case_study'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE node_members ADD CONSTRAINT node_members_role_check
    CHECK (role IN ('owner', 'collaborator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE node_members ADD CONSTRAINT node_members_source_check
    CHECK (source IS NULL OR source IN ('creator', 'accepted', 'granted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One membership row per (node, user). Partial so the unused FK column of the
-- other target kind never blocks insertion, and so ON CONFLICT below can infer
-- the right index. NULLs being distinct would defeat a plain unique index here.
CREATE UNIQUE INDEX IF NOT EXISTS node_members_issue_user_uq
  ON node_members (issue_id, user_id) WHERE target_kind = 'issue';
CREATE UNIQUE INDEX IF NOT EXISTS node_members_case_study_user_uq
  ON node_members (case_study_id, user_id) WHERE target_kind = 'case_study';

-- Backfill: every existing creator becomes an owner of their node.
INSERT INTO node_members (target_kind, issue_id, user_id, role, source)
SELECT 'issue', i.id, i.author_id, 'owner', 'creator'
FROM issues i
WHERE i.author_id IS NOT NULL
ON CONFLICT (issue_id, user_id) WHERE target_kind = 'issue' DO NOTHING;

INSERT INTO node_members (target_kind, case_study_id, user_id, role, source)
SELECT 'case_study', c.id, c.author_id, 'owner', 'creator'
FROM case_studies c
WHERE c.author_id IS NOT NULL
ON CONFLICT (case_study_id, user_id) WHERE target_kind = 'case_study' DO NOTHING;

-- Backfill: anyone whose proposal was approved on a node they didn't create
-- becomes a collaborator. `IS DISTINCT FROM` keeps the creator out (they're an
-- owner) while still crediting proposers on author-less nodes.
INSERT INTO node_members (target_kind, issue_id, user_id, role, source)
SELECT DISTINCT 'issue', r.issue_id, r.proposer_id, 'collaborator', 'accepted'
FROM revisions r
JOIN issues i ON i.id = r.issue_id
WHERE r.target_kind = 'issue'
  AND r.status = 'approved'
  AND r.proposer_id IS NOT NULL
  AND r.proposer_id IS DISTINCT FROM i.author_id
ON CONFLICT (issue_id, user_id) WHERE target_kind = 'issue' DO NOTHING;

INSERT INTO node_members (target_kind, case_study_id, user_id, role, source)
SELECT DISTINCT 'case_study', r.case_study_id, r.proposer_id, 'collaborator', 'accepted'
FROM revisions r
JOIN case_studies c ON c.id = r.case_study_id
WHERE r.target_kind = 'case_study'
  AND r.status = 'approved'
  AND r.proposer_id IS NOT NULL
  AND r.proposer_id IS DISTINCT FROM c.author_id
ON CONFLICT (case_study_id, user_id) WHERE target_kind = 'case_study' DO NOTHING;
