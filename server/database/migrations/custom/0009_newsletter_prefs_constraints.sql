-- `.$type<NewsletterFrequency>()` narrows TypeScript only — enforce the enum
-- in the DB like every other enum text column (see 0002).
DO $$ BEGIN
  ALTER TABLE newsletter_prefs ADD CONSTRAINT newsletter_prefs_frequency_check
    CHECK (frequency IN ('weekly', 'monthly'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
