-- Reading a card out is two model calls and minutes of synthesis, which is far
-- longer than an origin request may take — CloudFront gives 60 seconds. So the
-- press now claims a row and answers, and the run happens behind it. That means
-- a row exists before there is anything in it, and the columns it fills in last
-- need somewhere to start.

-- 'ready' is right for both readers of this default. Every row that exists
-- today is a finished recording, and during the seconds between this migration
-- and the new bundle the old code still inserts one only when it has finished.
ALTER TABLE "card_narrations" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';

-- What the learner is told when a run stops. "" for every other status.
ALTER TABLE "card_narrations" ADD COLUMN "error" TEXT NOT NULL DEFAULT '';

-- Unknown until the run finishes, so a claimed row can be inserted without
-- naming them. The object key, the card's date and the voice are all known at
-- the moment of the claim and stay NOT NULL with no default.
ALTER TABLE "card_narrations" ALTER COLUMN "script" SET DEFAULT '';
ALTER TABLE "card_narrations" ALTER COLUMN "seconds" SET DEFAULT 0;
ALTER TABLE "card_narrations" ALTER COLUMN "bytes" SET DEFAULT 0;
