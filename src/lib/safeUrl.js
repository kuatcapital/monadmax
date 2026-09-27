// src/lib/safeUrl.js
//
// URLs that come from outside (validator registry, token metadata, price
// APIs) are untrusted. Only https:// links and our own /files are allowed —
// this blocks javascript:, data:, and other schemes that could run code or
// spoof content when used in href/src.

export function safeUrl(url) {
  if (typeof url !== 'string' || !url) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url // same-origin asset
  try {
    const u = new URL(url)
    return u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}
