ALTER TABLE "oauth_codes" ADD COLUMN "resource" text;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "resource" text;