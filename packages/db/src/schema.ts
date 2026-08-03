import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// analytics — tracking tables
// ---------------------------------------------------------------------------

export const emailOpens = pgTable(
  "email_opens",
  {
    id: serial("id").primaryKey(),
    trackingId: text("tracking_id").notNull(),
    messageId: text("message_id").notNull(),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    openedAt: timestamp("opened_at").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
  },
  (table) => [
    index("email_opens_campaign_idx").on(table.campaignId),
    index("email_opens_message_idx").on(table.messageId),
    uniqueIndex("email_opens_tracking_day_idx").on(table.trackingId, sql`date_trunc('day', ${table.openedAt})`),
  ],
);

export const linkClicks = pgTable(
  "link_clicks",
  {
    id: serial("id").primaryKey(),
    trackingId: text("tracking_id").notNull(),
    messageId: text("message_id").notNull(),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    clickedAt: timestamp("clicked_at").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
  },
  (table) => [
    uniqueIndex("link_clicks_message_url_idx").on(table.messageId, table.originalUrl),
    index("link_clicks_campaign_idx").on(table.campaignId),
    index("link_clicks_tracking_idx").on(table.trackingId),
  ],
);

// ---------------------------------------------------------------------------
// connections — SMTP mailboxes
// ---------------------------------------------------------------------------
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  smtpUser: text("smtp_user").notNull(),
  smtpPassEncrypted: text("smtp_pass_encrypted").notNull(),
  dailyLimit: integer("daily_limit").notNull().default(50),
  status: text("status").notNull().default("active"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  imapUidValidity: integer("imap_uid_validity"),
  lastTestedAt: timestamp("last_tested_at"),
  lastError: text("last_error"),
  dnsRecords: jsonb("dns_records").$type<{
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    valid: boolean;
    checkedAt: string;
  }>(),
  imapEnabled: boolean("imap_enabled").notNull().default(false),
  imapSameAsSmtp: boolean("imap_same_as_smtp").notNull().default(true),
  imapHost: text("imap_host"),
  imapPort: integer("imap_port").default(993),
  imapSecure: boolean("imap_secure").default(true),
  imapUser: text("imap_user"),
  imapPassEncrypted: text("imap_pass_encrypted"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// lists — named lead lists
// ---------------------------------------------------------------------------
export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// leads — individual contacts
// ---------------------------------------------------------------------------
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  listId: integer("list_id")
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull(),
  company: text("company").notNull().default(""),
  openingLine: text("opening_line").notNull().default(""),
  customFields: jsonb("custom_fields")
    .$type<Record<string, string>>()
    .default({}),
  status: text("status").notNull().default("new"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// sequences — multi-step email sequences (replaces single templates)
// ---------------------------------------------------------------------------
export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  opens: integer("opens").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  lastOpenAt: timestamp("last_open_at"),
  lastClickAt: timestamp("last_click_at"),
});

// ---------------------------------------------------------------------------
// sequence_steps — individual emails within a sequence (ordered)
// ---------------------------------------------------------------------------
export const sequenceSteps = pgTable("sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id")
    .notNull()
    .references(() => sequences.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  delayDays: integer("delay_days").notNull().default(0),
  sameThread: boolean("same_thread").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// campaigns — pair sequence + list + schedule
// ---------------------------------------------------------------------------
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sequenceId: integer("sequence_id").references(() => sequences.id, {
    onDelete: "set null",
  }),
  listId: integer("list_id").references(() => lists.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("draft"),
  sendWindowStart: text("send_window_start").notNull().default("09:00"),
  sendWindowEnd: text("send_window_end").notNull().default("17:00"),
  timezone: text("timezone").notNull().default("UTC"),
  daysOfWeek: jsonb("days_of_week")
    .$type<number[]>()
    .notNull()
    .default([1, 2, 3, 4, 5]),
  dailyCap: integer("daily_cap").notNull().default(100),
  minDelaySeconds: integer("min_delay_seconds").notNull().default(60),
  maxDelaySeconds: integer("max_delay_seconds").notNull().default(300),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  opens: integer("opens").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  lastOpenAt: timestamp("last_open_at"),
  lastClickAt: timestamp("last_click_at"),
});

// ---------------------------------------------------------------------------
// campaign_connections — which mailboxes a campaign rotates through
// ---------------------------------------------------------------------------
export const campaignConnections = pgTable(
  "campaign_connections",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("campaign_connection_unique").on(
      table.campaignId,
      table.connectionId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// messages — per-lead send queue + delivery log
// ---------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    sequenceId: integer("sequence_id").references(() => sequences.id, {
      onDelete: "set null",
    }),
    connectionId: integer("connection_id").references(() => connections.id, {
      onDelete: "set null",
    }),
    stepPosition: integer("step_position").notNull().default(1),
    status: text("status").notNull().default("queued"),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    messageId: text("message_id"),
    renderedSubject: text("rendered_subject"),
    renderedBody: text("rendered_body"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (table) => [
    index("messages_status_scheduled_idx").on(table.status, table.scheduledAt),
    index("messages_status_sent_idx").on(table.status, table.sentAt),
    index("messages_lead_status_idx").on(table.leadId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// inbound_emails — received mail fetched via IMAP across all mailboxes
// ---------------------------------------------------------------------------
export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: serial("id").primaryKey(),
    connectionId: integer("connection_id").references(() => connections.id, {
      onDelete: "cascade",
    }),
    uid: integer("uid"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    references: text("references"),
    fromName: text("from_name").notNull().default(""),
    fromEmail: text("from_email").notNull().default(""),
    toEmail: text("to_email").notNull().default(""),
    subject: text("subject").notNull().default(""),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    isFiltered: boolean("is_filtered").notNull().default(false),
    isBounce: boolean("is_bounce").notNull().default(false),
    isRead: boolean("is_read").notNull().default(false),
    repliedAt: timestamp("replied_at"),
    category: text("category").notNull().default("none"),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("inbound_email_uid_unique").on(table.connectionId, table.uid),
  ],
);

// ---------------------------------------------------------------------------
// app_settings — simple key-value store for app-level configuration
// ---------------------------------------------------------------------------
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// links — per-link click tracking aggregated per message
// ---------------------------------------------------------------------------
export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull(),
  url: text("url").notNull(),
  clicks: integer("clicks").notNull().default(0),
});

// ---------------------------------------------------------------------------
// daily_analytics — per-day global statistics for fast dashboard queries
// ---------------------------------------------------------------------------
export const dailyAnalytics = pgTable(
  "daily_analytics",
  {
    id: serial("id").primaryKey(),
    date: timestamp("date").notNull(),
    opens: integer("opens").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
  },
  (table) => [
    uniqueIndex("daily_analytics_date_unique").on(table.date),
    index("daily_analytics_date_idx").on(table.date),
  ]
);

// ---------------------------------------------------------------------------
// scheduler_state — persisted round-robin cursor and other scheduler state
// ---------------------------------------------------------------------------
export const schedulerState = pgTable("scheduler_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Inferred types — convenient for use across the app
// ---------------------------------------------------------------------------
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;

export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type NewSequenceStep = typeof sequenceSteps.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignConnection = typeof campaignConnections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type InboundEmail = typeof inboundEmails.$inferSelect;
export type NewInboundEmail = typeof inboundEmails.$inferInsert;

export type AppSetting = typeof appSettings.$inferSelect;

export type EmailOpen = typeof emailOpens.$inferSelect;
export type NewEmailOpen = typeof emailOpens.$inferInsert;

export type LinkClick = typeof linkClicks.$inferSelect;
export type NewLinkClick = typeof linkClicks.$inferInsert;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;

export type DailyAnalytic = typeof dailyAnalytics.$inferSelect;
export type NewDailyAnalytic = typeof dailyAnalytics.$inferInsert;

export type SchedulerStateRow = typeof schedulerState.$inferSelect;
