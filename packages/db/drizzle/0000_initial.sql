CREATE TABLE "sequences" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "opens" integer DEFAULT 0 NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "last_open_at" timestamp,
  "last_click_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sequence_steps" (
  "id" serial PRIMARY KEY NOT NULL,
  "sequence_id" integer NOT NULL,
  "position" integer NOT NULL,
  "subject" text DEFAULT '' NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "delay_days" integer DEFAULT 0 NOT NULL,
  "same_thread" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "lists" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "list_id" integer NOT NULL,
  "first_name" text DEFAULT '' NOT NULL,
  "last_name" text DEFAULT '' NOT NULL,
  "email" text NOT NULL,
  "company" text DEFAULT '' NOT NULL,
  "opening_line" text DEFAULT '' NOT NULL,
  "custom_fields" jsonb DEFAULT '{}' NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "opened_at" timestamp,
  "clicked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "from_name" text NOT NULL,
  "from_email" text NOT NULL,
  "smtp_host" text NOT NULL,
  "smtp_port" integer DEFAULT 587 NOT NULL,
  "smtp_secure" boolean DEFAULT false NOT NULL,
  "smtp_user" text NOT NULL,
  "smtp_pass_encrypted" text NOT NULL,
  "daily_limit" integer DEFAULT 50 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "imap_uid_validity" integer,
  "last_tested_at" timestamp,
  "last_error" text,
  "dns_records" jsonb,
  "imap_enabled" boolean DEFAULT false NOT NULL,
  "imap_same_as_smtp" boolean DEFAULT true NOT NULL,
  "imap_host" text,
  "imap_port" integer DEFAULT 993,
  "imap_secure" boolean DEFAULT true,
  "imap_user" text,
  "imap_pass_encrypted" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "sequence_id" integer,
  "list_id" integer,
  "status" text DEFAULT 'draft' NOT NULL,
  "send_window_start" text DEFAULT '09:00' NOT NULL,
  "send_window_end" text DEFAULT '17:00' NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "days_of_week" jsonb DEFAULT '[1,2,3,4,5]' NOT NULL,
  "daily_cap" integer DEFAULT 100 NOT NULL,
  "min_delay_seconds" integer DEFAULT 60 NOT NULL,
  "max_delay_seconds" integer DEFAULT 300 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "opens" integer DEFAULT 0 NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "last_open_at" timestamp,
  "last_click_at" timestamp,
  FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON UPDATE no action ON DELETE set null,
  FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE "campaign_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_id" integer NOT NULL,
  "connection_id" integer NOT NULL,
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_connection_unique" ON "campaign_connections" ("campaign_id","connection_id");
--> statement-breakpoint
CREATE TABLE "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_id" integer,
  "lead_id" integer NOT NULL,
  "sequence_id" integer,
  "connection_id" integer,
  "step_position" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "scheduled_at" timestamp,
  "sent_at" timestamp,
  "message_id" text,
  "rendered_subject" text,
  "rendered_body" text,
  "error" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON UPDATE no action ON DELETE set null,
  FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX "messages_status_scheduled_idx" ON "messages" ("status", "scheduled_at");
--> statement-breakpoint
CREATE INDEX "messages_status_sent_idx" ON "messages" ("status", "sent_at");
--> statement-breakpoint
CREATE INDEX "messages_lead_status_idx" ON "messages" ("lead_id", "status");
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
  "id" serial PRIMARY KEY NOT NULL,
  "connection_id" integer,
  "uid" integer,
  "message_id" text,
  "in_reply_to" text,
  "references" text,
  "from_name" text DEFAULT '' NOT NULL,
  "from_email" text DEFAULT '' NOT NULL,
  "to_email" text DEFAULT '' NOT NULL,
  "subject" text DEFAULT '' NOT NULL,
  "body_text" text,
  "body_html" text,
  "is_filtered" boolean DEFAULT false NOT NULL,
  "is_bounce" boolean DEFAULT false NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "replied_at" timestamp,
  "category" text DEFAULT 'none' NOT NULL,
  "received_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_email_uid_unique" ON "inbound_emails" ("connection_id", "uid");
--> statement-breakpoint
CREATE TABLE "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text DEFAULT '' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
  "id" serial PRIMARY KEY NOT NULL,
  "message_id" text NOT NULL,
  "url" text NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_analytics" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" timestamp NOT NULL,
  "opens" integer DEFAULT 0 NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_analytics_date_unique" ON "daily_analytics" ("date");
--> statement-breakpoint
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics" ("date");
--> statement-breakpoint
CREATE TABLE "email_opens" (
  "id" serial PRIMARY KEY NOT NULL,
  "tracking_id" text NOT NULL,
  "message_id" text NOT NULL,
  "campaign_id" integer,
  "lead_id" integer,
  "opened_at" timestamp NOT NULL,
  "user_agent" text,
  "ip_address" text,
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX "email_opens_campaign_idx" ON "email_opens" ("campaign_id");
--> statement-breakpoint
CREATE INDEX "email_opens_message_idx" ON "email_opens" ("message_id");
--> statement-breakpoint
CREATE TABLE "link_clicks" (
  "id" serial PRIMARY KEY NOT NULL,
  "tracking_id" text NOT NULL,
  "message_id" text NOT NULL,
  "campaign_id" integer,
  "lead_id" integer,
  "original_url" text NOT NULL,
  "clicked_at" timestamp NOT NULL,
  "user_agent" text,
  "ip_address" text,
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "link_clicks_message_url_idx" ON "link_clicks" ("message_id", "original_url");
--> statement-breakpoint
CREATE INDEX "link_clicks_campaign_idx" ON "link_clicks" ("campaign_id");
--> statement-breakpoint
CREATE INDEX "link_clicks_tracking_idx" ON "link_clicks" ("tracking_id");
--> statement-breakpoint
CREATE TABLE "scheduler_state" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
