-- DB-level invariants. Drizzle's `.$type<>()` only narrows TypeScript reads,
-- so without these constraints a Drizzle Studio edit, raw psql session, or
-- buggy migration could write garbage values that the application would
-- happily read back.
--
-- Wrapped in DO blocks because Postgres has no `ADD CONSTRAINT IF NOT EXISTS`.

-- ── issues ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_type_check
    CHECK (type IN ('issue', 'solution'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_appeal_status_check
    CHECK (appeal_status IS NULL OR appeal_status IN ('pending', 'approved', 'denied'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_scale_check
    CHECK (scale IS NULL OR scale IN ('neighborhood', 'city', 'region', 'national', 'global'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_solution_status_check
    CHECK (solution_status IS NULL OR solution_status IN ('plan', 'in-progress', 'done'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A solution must always belong to a parent issue
DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_solution_has_parent
    CHECK (type <> 'solution' OR parent_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A rejected issue must carry a reason
DO $$ BEGIN
  ALTER TABLE issues ADD CONSTRAINT issues_rejected_has_reason
    CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── votes ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE votes ADD CONSTRAINT votes_value_check
    CHECK (value IN (-1, 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE votes ADD CONSTRAINT votes_weight_check
    CHECK (weight BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── users ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_trust_score_check
    CHECK (trust_score BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_provider_check
    CHECK (provider IS NULL OR provider IN ('google', 'apple', 'passkey'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_ban_appeal_status_check
    CHECK (ban_appeal_status IS NULL OR ban_appeal_status IN ('pending', 'approved', 'denied'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A banned user should always have a reason recorded
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_banned_has_reason
    CHECK (banned_until IS NULL OR ban_reason IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
