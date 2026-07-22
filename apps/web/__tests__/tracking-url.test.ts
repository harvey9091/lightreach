import { describe, it, expect } from 'vitest'
import { makeTrackingUrl } from '@workspace/core/email/tracking'

describe('makeTrackingUrl', () => {
  const trackingId = 'test-tracking-id-123'
  const baseUrl = 'https://lightreach.jasperfilmz.online'

  it('returns a tracking URL for a simple destination', () => {
    const result = makeTrackingUrl('https://example.com', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=https%3A%2F%2Fexample.com')
  })

  it('preserves query parameters through encoding', () => {
    const result = makeTrackingUrl('https://example.com/path?foo=bar&baz=qux', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar%26baz%3Dqux')
  })

  it('preserves anchor fragments', () => {
    const result = makeTrackingUrl('https://example.com/path#anchor', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=https%3A%2F%2Fexample.com%2Fpath%23anchor')
  })

  it('handles URLs with special characters', () => {
    const result = makeTrackingUrl('https://example.com/path?q=hello world&tag=a+b', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dhello%20world%26tag%3Da%2Bb')
  })

  it('handles http URLs', () => {
    const result = makeTrackingUrl('http://example.com', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=http%3A%2F%2Fexample.com')
  })

  it('does not double-encode already-encoded URLs', () => {
    const result = makeTrackingUrl('https://example.com/path%20with%20spaces', trackingId, baseUrl)
    expect(result).toBe('https://lightreach.jasperfilmz.online/api/tracking/click/test-tracking-id-123?url=https%3A%2F%2Fexample.com%2Fpath%2520with%2520spaces')
  })
})
