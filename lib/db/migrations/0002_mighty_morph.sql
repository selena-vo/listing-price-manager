CREATE TABLE "listing_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"platform_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_platforms" ADD CONSTRAINT "listing_platforms_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_platforms" ADD CONSTRAINT "listing_platforms_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_platforms_listing_platform_unique" ON "listing_platforms" USING btree ("listing_id","platform_id");