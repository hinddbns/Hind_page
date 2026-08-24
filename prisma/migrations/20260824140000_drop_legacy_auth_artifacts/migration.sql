-- Final NextAuth-to-Supabase-Auth cutover: Supabase Auth (auth.users) is now
-- the sole authority for credentials, password reset, and email verification.
-- These columns/tables were the NextAuth-era mechanisms for the same concerns
-- and have had zero application code referencing them since the migration.

-- DropForeignKey
ALTER TABLE "EmailVerificationOtp" DROP CONSTRAINT "EmailVerificationOtp_userId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt",
DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockedUntil",
DROP COLUMN "passwordHash";

-- DropTable
DROP TABLE "EmailVerificationOtp";

-- DropTable
DROP TABLE "PasswordResetToken";
