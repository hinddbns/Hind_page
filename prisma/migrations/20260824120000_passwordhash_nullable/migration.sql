-- AlterTable
-- Supabase Auth (not this column) is becoming the authority for credentials;
-- new profiles created through the Supabase-Auth signup path have no
-- passwordHash at all. Existing NextAuth-era rows keep theirs untouched
-- until the final cutover drops this column entirely.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
