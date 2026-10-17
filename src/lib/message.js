function encodeUtf8Base64Url(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function normalizeSubject(subject) {
  const safe = sanitizeHeader(subject)
  return /^re:/i.test(safe) ? safe : `Re: ${safe}`
}

function sanitizeHeader(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim()
}

export function buildReplyRaw({ to, subject, messageId, references, body, documentId }) {
  const headers = [
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${normalizeSubject(subject)}`,
    `In-Reply-To: ${sanitizeHeader(messageId)}`,
    `References: ${[references, messageId].filter(Boolean).map(sanitizeHeader).join(" ")}`,
    `X-Gmail-From-Docs-Document-Id: ${sanitizeHeader(documentId)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit"
  ]

  return encodeUtf8Base64Url(`${headers.join("\r\n")}\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}`)
}

export function headerValue(headers, name) {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}
