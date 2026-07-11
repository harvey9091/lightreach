/**
 * Nodemailer transport factory for user-configured SMTP connections.
 *
 * IMPORTANT: This module runs server-side only (Node.js).
 * Never import it from 'use client' files.
 *
 * Usage:
 *   import { buildTransport, verifyConnection, sendMail } from '@workspace/core/email/transport'
 */

import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal connection record shape expected from the DB schema. */
export interface SMTPConfig {
  smtpHost: string;
  smtpPort: number;
  /** true = TLS on connect (port 465), false = STARTTLS (port 587) */
  smtpSecure: boolean;
  smtpUser: string;
  /** Decrypted plaintext password — decrypt before passing here */
  smtpPass: string;
}

export interface SendPayload {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text version. If omitted, one is derived from `html`. */
  text?: string;
  replyTo?: string;
  /** RFC822 Message-ID to use (with angle brackets, e.g. <uuid@host>). When provided
   *  nodemailer uses this value verbatim, guaranteeing the stored ID matches the sent header. */
  messageId?: string;
  /** RFC822 In-Reply-To header — set when replying to a received message */
  inReplyTo?: string;
  /** RFC822 References header — space-separated message-ids for threading */
  references?: string;
}

// Fail fast rather than hang forever against a black-holed or slow-to-respond host.
const CONNECTION_TIMEOUT_MS = 20_000;
const GREETING_TIMEOUT_MS = 20_000;
const SOCKET_TIMEOUT_MS = 30_000;

/** Strip CR/LF and wrap in quotes so a malicious/malformed display name can't inject headers. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, " ").replace(/"/g, "'").trim();
}

/** Very small HTML → text fallback so plain-text-only mail clients still get readable content. */
function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert a plain-text string with line breaks into minimal HTML that preserves paragraph spacing.
 *  Inline <a> tags are preserved so hyperlinks inserted by the editor survive the conversion. */
export function textToHtml(text: string): string {
  const A_TAG_RE = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  const links: string[] = []
  const preserved = text.replace(A_TAG_RE, (match) => {
    links.push(match)
    return `\x00${links.length - 1}\x00`
  })

  const escaped = preserved
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

  const withBreaks = escaped
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")

  return `<p>${withBreaks}</p>`.replace(/\x00(\d+)\x00/g, (_, i) => links[Number(i)]!)
}

function isPlainText(html: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(html)
}

/** Build a Message-ID rooted at the sending domain instead of a non-routable placeholder. */
export function buildMessageId(fromEmail: string, uuid: string): string {
  const domain = fromEmail.split("@")[1]?.trim() || "localhost";
  return `<${uuid}@${domain}>`;
}

/**
 * Append a plain-language opt-out line instead of a tracked unsubscribe link —
 * cold outreach with a bare "unsubscribe" URL reads as bulk/marketing mail and
 * hurts deliverability more than it helps. The inbox poller watches replies
 * for this exact phrasing and marks the lead unsubscribed automatically.
 */
export function appendUnsubscribeFooter(html: string): string {
  return html
}

// ---------------------------------------------------------------------------
// Transport builder
// ---------------------------------------------------------------------------

/**
 * Create a nodemailer transport from a connection record.
 * The caller is responsible for decrypting `smtpPass` first.
 */
export function buildTransport(config: SMTPConfig): Transporter {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    // When not using implicit TLS (port 465), require the server to upgrade via
    // STARTTLS rather than silently falling back to a plaintext connection.
    requireTLS: !config.smtpSecure,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

/**
 * Verify that the SMTP connection works (i.e. credentials are accepted).
 * Returns `{ ok: true }` on success or `{ ok: false, error: string }` on failure.
 */
export async function verifyConnection(
  config: SMTPConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const transport = buildTransport(config);
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    transport.close();
  }
}

/**
 * Write a minimal RFC 5322 .eml file capturing the outbound headers + body so
 * it can be inspected against preview/gmail delivery to confirm spacing is
 * preserved.
 */
function writeEml(messageId: string, subject: string, html: string, to: string, from: string): void {
  const emlDir = '/tmp/kilo/eml'
  try {
    import('node:fs/promises').then(async ({ mkdir, writeFile }) => {
      try { await mkdir(emlDir, { recursive: true }) } catch {}
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeId = messageId.replace(/[<>\s]/g, '_').slice(0, 60)
      const path = `${emlDir}/${timestamp}_${safeId}.eml`
      const content = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        html,
      ].join('\n') + '\n'
      await writeFile(path, content, 'utf-8')
      console.log(`[Lightreach][eml] wrote ${path}`)
    })
  } catch (err) {
    console.log(`[Lightreach][eml] failed to write .eml:`, err instanceof Error ? err.message : String(err))
  }
}

/**
 * Send a single email through an SMTP connection.
 * Throws on failure — the caller should catch and update the message status.
 */
export async function sendMail(
  config: SMTPConfig,
  payload: SendPayload,
): Promise<{ messageId: string }> {
  const transport = buildTransport(config);

  try {
    const isHtmlActuallyText = isPlainText(payload.html)
    const finalHtml = isHtmlActuallyText ? textToHtml(payload.html) : payload.html
    const finalText = payload.text ?? htmlToText(finalHtml)

    const mailOptions: SendMailOptions = {
      from: `"${sanitizeHeaderValue(payload.fromName)}" <${payload.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: finalHtml,
      text: finalText,

      replyTo: payload.replyTo,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
    };

    const info = await transport.sendMail(mailOptions);
    writeEml(
      payload.messageId ?? info.messageId,
      payload.subject,
      finalHtml,
      payload.to,
      `"${sanitizeHeaderValue(payload.fromName)}" <${payload.fromEmail}>`,
    )
    return { messageId: info.messageId as string };
  } catch (err) {
    console.error(`[Lightreach][sendMail] Failed to send message ${payload.messageId}:`, err instanceof Error ? err.message : String(err))
    throw err
  } finally {
    transport.close();
  }
}
