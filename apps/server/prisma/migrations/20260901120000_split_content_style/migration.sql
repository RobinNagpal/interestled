-- One style column asking three questions becomes two that ask one each, plus
-- the format, which is neither of them.
--
-- The defaults are for the deploy gap only: migrations run from the runner
-- before the new bundle ships, so for a few seconds the old code is still
-- inserting topics that name none of these columns. Drop them in the next
-- schema change, along with topics.style itself — which is kept here for the
-- other half of the same gap, where the old code still SELECTs it.
ALTER TABLE "topics"
  ADD COLUMN "english_level" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "technical_detail" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "format" TEXT NOT NULL DEFAULT 'prose';

-- Carried over from the value each topic already had. "Short" is not a level of
-- English and never was — how long the writing runs is average_read_time's
-- question — so the two short styles map by their register alone, which is the
-- part of them these columns actually carry.
UPDATE "topics" SET
  "english_level" = CASE "style"
    WHEN 'plain_and_deep' THEN 'simple'
    WHEN 'technical_and_deep' THEN 'advanced'
    ELSE 'medium'
  END,
  "technical_detail" = CASE "style"
    WHEN 'short_and_technical' THEN 'high'
    WHEN 'technical_and_deep' THEN 'high'
    ELSE 'medium'
  END,
  "format" = CASE "style"
    WHEN 'reference_notes' THEN 'reference_notes'
    ELSE 'prose'
  END;
