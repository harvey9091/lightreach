/**
 * Email tracking utilities — open-pixel injection and link rewriting.
 *
 * Call order:
 *   1. expandSpintax(step.body)
 *   2. renderVariables(spintaxBody, vars)
 *   3. textToHtml(renderedText)
 *   4. buildTrackingHtml(html, trackingId, messageId, campaignId, leadId, settings)
 *   5. sendMail(...)
 *
 * Only links are rewritten and one pixel is appended.
 * All existing variables, spintax, inline <a> tags, and spacing remain untouched.
 */

export function buildTrackingHtml({
  html,
  trackingId,
  messageId,
  campaignId,
  leadId,
  enableOpenTracking,
  enableLinkTracking,
  domain,
}: {
  html: string
  trackingId: string
  messageId: string
  campaignId: number | undefined
  leadId: number
  enableOpenTracking: boolean
  enableLinkTracking: boolean
  domain?: string
}): string {
  let result = html
  if (enableLinkTracking) {
    result = rewriteLinks(result, trackingId)
  }
  if (enableOpenTracking) {
    result = injectPixel(result, trackingId, domain)
  }
  return result
}

// ---------------------------------------------------------------------------
// Link rewriting
// ---------------------------------------------------------------------------

/**
 * Rewrite every HTTP/HTTPS URL in the HTML body to route through our tracking
 * endpoint: /api/tracking/click/:trackingId?url=<original>
 *
 * Handles both bare URLs (left as text by textToHtml) and existing
 * <a href="..."> tags. Already-tracked links (with x-tracking-href) are left alone.
 */
function rewriteLinks(html: string, trackingId: string): string {
  // Process anchor tags first — mark them so we don't double-rewrite
  const trackedAnchorRe = /x-tracking-href="[^"]*"/
  const result = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    if (trackedAnchorRe.test(match)) return match
    return rewriteHrefInAnchor(match, trackingId)
  })

  // Rewrite bare URLs that were NOT wrapped in <a> (textToHtml may wrap them
  // differently, but plain text URLs remain plain text).
  return result.replace(/(https?:\/\/[^\s"'<>]+)/gi, (url, offset) => {
    // Skip URLs that are already part of our tracking endpoints
    if (url.includes("/api/tracking/")) return url
    return makeTrackingUrl(url, trackingId)
  })
}

function rewriteHrefInAnchor(anchor: string, trackingId: string): string {
  return anchor.replace(
    /href\s*=\s*"([^"]+)"/i,
    (match, url) =>
      `href="${makeTrackingUrl(url, trackingId)}" x-tracking-href="${url}"`,
  )
}

function makeTrackingUrl(originalUrl: string, trackingId: string): string {
  const encoded = encodeURIComponent(originalUrl)
  return `/api/tracking/click/${trackingId}?url=${encoded}`
}

// ---------------------------------------------------------------------------
// Open-tracking pixel
// ---------------------------------------------------------------------------

function injectPixel(html: string, trackingId: string, domain?: string): string {
  const base = domain ? `https://${domain}` : ""
  const pixelSrc = `${base}/api/tracking/open/${trackingId}`
  const pixel = `<img src="${pixelSrc}" width="1" height="1" style="display:none" alt="" />`
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${pixel}</body>`)
  }
  return html + pixel
}
