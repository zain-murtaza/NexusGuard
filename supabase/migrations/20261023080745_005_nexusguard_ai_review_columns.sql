/*
# NexusGuard Phase 3 — AI Review Columns on ai_analysis_runs

Adds columns to support AI-assisted security reviews persisted alongside
the existing deterministic gap-analysis runs. Reviews are stored as their
own run_type ('ai_review') and linked to the finding they explain.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'finding_id') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN finding_id uuid REFERENCES findings(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'provider') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN provider text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'model_name') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN model_name text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'review_content') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN review_content jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'thread_id') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN thread_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_runs_finding_id ON ai_analysis_runs(finding_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_org_finding ON ai_analysis_runs(organization_id, finding_id);
