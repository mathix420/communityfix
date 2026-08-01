-- A foreign key can prove that a linked node exists, but not that the row is
-- actually a solution. Mirror the application validation for direct SQL writes.
CREATE OR REPLACE FUNCTION assert_case_study_solution_target() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM issues WHERE id = NEW.solution_id AND type = 'solution'
  ) THEN
    RAISE EXCEPTION 'Case studies can only link to solutions (solution_id=%)', NEW.solution_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_study_solution_target ON case_study_solutions;
CREATE TRIGGER trg_case_study_solution_target
  BEFORE INSERT OR UPDATE OF solution_id ON case_study_solutions
  FOR EACH ROW
  EXECUTE FUNCTION assert_case_study_solution_target();

-- A valid link must also stay valid if the target issue itself is edited.
CREATE OR REPLACE FUNCTION assert_linked_issue_remains_solution() RETURNS trigger AS $$
BEGIN
  IF NEW.type <> 'solution' AND EXISTS (
    SELECT 1 FROM case_study_solutions WHERE solution_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Linked solution % cannot be changed to type %', OLD.id, NEW.type
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linked_issue_remains_solution ON issues;
CREATE TRIGGER trg_linked_issue_remains_solution
  BEFORE UPDATE OF type ON issues
  FOR EACH ROW
  EXECUTE FUNCTION assert_linked_issue_remains_solution();

-- Relationship replacement happens inside one transaction. Check at commit so
-- replacing every old link with a new set never exposes a valid case study as
-- an orphan, while still rejecting inserts/deletes that leave no links.
CREATE OR REPLACE FUNCTION assert_case_study_has_solution() RETURNS trigger AS $$
DECLARE
  study_id integer;
BEGIN
  IF TG_TABLE_NAME = 'case_studies' THEN
    study_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    study_id := OLD.case_study_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.case_study_id IS DISTINCT FROM NEW.case_study_id
       AND EXISTS (SELECT 1 FROM case_studies WHERE id = OLD.case_study_id)
       AND NOT EXISTS (
         SELECT 1 FROM case_study_solutions WHERE case_study_id = OLD.case_study_id
       ) THEN
      RAISE EXCEPTION 'Case study % must link to at least one solution', OLD.case_study_id
        USING ERRCODE = '23514';
    END IF;
    study_id := NEW.case_study_id;
  ELSE
    study_id := NEW.case_study_id;
  END IF;

  IF EXISTS (SELECT 1 FROM case_studies WHERE id = study_id)
     AND NOT EXISTS (
       SELECT 1 FROM case_study_solutions WHERE case_study_id = study_id
     ) THEN
    RAISE EXCEPTION 'Case study % must link to at least one solution', study_id
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_study_has_solution_row ON case_studies;
CREATE CONSTRAINT TRIGGER trg_case_study_has_solution_row
  AFTER INSERT OR UPDATE ON case_studies
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION assert_case_study_has_solution();

DROP TRIGGER IF EXISTS trg_case_study_has_solution_link ON case_study_solutions;
CREATE CONSTRAINT TRIGGER trg_case_study_has_solution_link
  AFTER INSERT OR UPDATE OR DELETE ON case_study_solutions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION assert_case_study_has_solution();
