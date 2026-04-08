CREATE TABLE "qualification_endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"qualification_id" integer NOT NULL,
	"endorser_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_endorsements_unique" UNIQUE("qualification_id","endorser_id")
);
--> statement-breakpoint
CREATE TABLE "qualifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"area" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "qualification_endorsements" ADD CONSTRAINT "qualification_endorsements_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_endorsements" ADD CONSTRAINT "qualification_endorsements_endorser_id_users_id_fk" FOREIGN KEY ("endorser_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qualification_endorsements_endorser_idx" ON "qualification_endorsements" USING btree ("endorser_id");--> statement-breakpoint
CREATE INDEX "qualifications_user_id_idx" ON "qualifications" USING btree ("user_id");