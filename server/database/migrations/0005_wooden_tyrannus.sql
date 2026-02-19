ALTER TABLE `issues` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `rejected_at` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `is_spam` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `issues` ADD `appeal_reason` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `appeal_status` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `appealed_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `banned_until` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ban_appealed_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ban_appeal_status` text;