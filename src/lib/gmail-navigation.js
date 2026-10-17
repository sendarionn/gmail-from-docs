const URL_KEY_PREFIX = "gmailFromDocsUrl"
const URL_COUNT_KEY = "gmailFromDocsUrlCount"
const URL_CHUNK_LENGTH = 80
const MAX_URL_CHUNKS = 20

export function validateGmailThreadUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "mail.google.com") return null
    if (!/^\/mail\/u\/[^/]+\/$/.test(url.pathname)) return null
    if (!url.hash || /^#(?:drafts|sent|trash|spam|settings)(?:\/|$)/.test(url.hash)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function validateGmailNavigationUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "mail.google.com") return null
    if (!url.pathname.startsWith("/mail/")) return null
    return url.toString()
  } catch {
    return null
  }
}

export function gmailUrlProperties(value) {
  const url = validateGmailThreadUrl(value)
  if (!url) return {}
  const chunks = []
  for (let index = 0; index < url.length; index += URL_CHUNK_LENGTH) {
    chunks.push(url.slice(index, index + URL_CHUNK_LENGTH))
  }
  if (chunks.length > MAX_URL_CHUNKS) return {}
  return Object.fromEntries([
    [URL_COUNT_KEY, String(chunks.length)],
    ...chunks.map((chunk, index) => [`${URL_KEY_PREFIX}${String(index).padStart(2, "0")}`, chunk])
  ])
}

export function gmailUrlFromProperties(properties = {}) {
  const count = Number.parseInt(properties[URL_COUNT_KEY], 10)
  if (!Number.isInteger(count) || count < 1 || count > MAX_URL_CHUNKS) return null
  const chunks = Array.from({ length: count }, (_, index) => properties[`${URL_KEY_PREFIX}${String(index).padStart(2, "0")}`])
  if (chunks.some((chunk) => typeof chunk !== "string")) return null
  return validateGmailThreadUrl(chunks.join(""))
}

export function gmailDraftsUrl(ownerEmail) {
  const url = new URL("https://mail.google.com/mail/")
  url.searchParams.set("authuser", ownerEmail)
  url.hash = "drafts"
  return url.toString()
}

export function resolveGmailNavigation(properties, ownerEmail) {
  const originalUrl = gmailUrlFromProperties(properties)
  return originalUrl
    ? { url: originalUrl, destination: "thread" }
    : { url: gmailDraftsUrl(ownerEmail), destination: "drafts" }
}
