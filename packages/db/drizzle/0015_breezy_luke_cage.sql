CREATE TABLE `daily_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_analytics_date_unique` ON `daily_analytics` (`date`);--> statement-breakpoint
CREATE INDEX `daily_analytics_date_idx` ON `daily_analytics` (`date`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`url` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `campaigns` ADD `opens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `clicks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `last_open_at` integer;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `last_click_at` integer;--> statement-breakpoint
ALTER TABLE `leads` ADD `opened_at` integer;--> statement-breakpoint
ALTER TABLE `leads` ADD `clicked_at` integer;--> statement-breakpoint
ALTER TABLE `sequences` ADD `opens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sequences` ADD `clicks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sequences` ADD `last_open_at` integer;--> statement-breakpoint
ALTER TABLE `sequences` ADD `last_click_at` integer;