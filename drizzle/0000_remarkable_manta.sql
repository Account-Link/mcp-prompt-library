CREATE TABLE "prompt_tags" (
	"prompt_id" text NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_variables" (
	"prompt_id" text NOT NULL,
	"variable_name" text NOT NULL,
	"variable_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" text NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"is_template" boolean NOT NULL,
	"category" text,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"category" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
