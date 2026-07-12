CREATE TABLE `email_opens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracking_id` text NOT NULL,
	`message_id` text NOT NULL,
	`campaign_id` integer,
	`lead_id` integer,
	`opened_at` integer NOT NULL,
	`user_agent` text,
	`ip_address` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_opens_tracking_day_idx` ON `email_opens` (`tracking_id`,cast(opened_at / 86400 as integer));--> statement-breakpoint
CREATE INDEX `email_opens_campaign_idx` ON `email_opens` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `email_opens_message_idx` ON `email_opens` (`message_id`);--> statement-breakpoint
CREATE TABLE `link_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracking_id` text NOT NULL,
	`message_id` text NOT NULL,
	`campaign_id` integer,
	`lead_id` integer,
	`original_url` text NOT NULL,
	`clicked_at` integer NOT NULL,
	`user_agent` text,
	`ip_address` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_clicks_message_url_idx` ON `link_clicks` (`message_id`,`original_url`);--> statement-breakpoint
CREATE INDEX `link_clicks_campaign_idx` ON `link_clicks` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `link_clicks_tracking_idx` ON `link_clicks` (`tracking_id`);