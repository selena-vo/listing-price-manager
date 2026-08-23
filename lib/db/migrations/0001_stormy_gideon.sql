CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"discount_percent" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"priority_order" integer,
	"type" varchar(50),
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homestays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"homestay_id" integer NOT NULL,
	"platform_id" integer NOT NULL,
	"price_per_night" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"commission_rate" integer DEFAULT 15 NOT NULL,
	"discount_rule" varchar(20) DEFAULT 'sum' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platforms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_prices" ADD CONSTRAINT "listing_prices_homestay_id_homestays_id_fk" FOREIGN KEY ("homestay_id") REFERENCES "public"."homestays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_prices" ADD CONSTRAINT "listing_prices_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_prices_homestay_platform_unique" ON "listing_prices" USING btree ("homestay_id","platform_id");