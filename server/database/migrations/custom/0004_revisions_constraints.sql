-- A revision targets exactly one node: either an issue/solution or a case
-- study, never both and never neither. Drizzle's nullable FKs can't express
-- "exactly one of", so the polymorphic invariant lives here. Wrapped in a DO
-- block because Postgres has no `ADD CONSTRAINT IF NOT EXISTS`.
DO $$ BEGIN
  ALTER TABLE revisions ADD CONSTRAINT revisions_one_target_check
    CHECK (((issue_id IS NOT NULL)::int + (case_study_id IS NOT NULL)::int) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE revisions ADD CONSTRAINT revisions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'superseded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE revisions ADD CONSTRAINT revisions_target_kind_check
    CHECK (target_kind IN ('issue', 'case_study'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One live proposal per user per node — a proposer can't queue two competing
-- pending edits for the same target. Partial so decided rows (approved /
-- rejected / withdrawn / superseded) don't collide. NULLs are distinct in a
-- unique index, so the unused FK column never blocks the other target kind.
CREATE UNIQUE INDEX IF NOT EXISTS revisions_one_pending_per_user_node
  ON revisions (proposer_id, issue_id, case_study_id)
  WHERE status = 'pending';
