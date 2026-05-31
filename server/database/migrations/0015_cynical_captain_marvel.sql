CREATE TABLE "standard_site_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection" text NOT NULL,
	"ref_kind" text NOT NULL,
	"ref_id" integer,
	"uri" text NOT NULL,
	"rkey" text NOT NULL,
	"cid" text,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "standard_site_records_ref_unique" UNIQUE("ref_kind","ref_id")
);
--> statement-breakpoint
CREATE INDEX "standard_site_records_collection_idx" ON "standard_site_records" USING btree ("collection");