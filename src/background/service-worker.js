import { AppError, publicError } from "../lib/errors.js"
import { inspectDocument, openOrCreateDocument, reflectDocument } from "./workflow.js"
import { validateGmailNavigationUrl } from "../lib/gmail-navigation.js"

const locks = new Map()

async function openGmail(url) {
  const safeUrl = validateGmailNavigationUrl(url)
  if (!safeUrl) throw new AppError("INVALID_GMAIL_URL", "Gmailの遷移先URLが不正です", "下書きは保存済みです。Gmailの下書き一覧を直接開いてください")
  await chrome.tabs.create({ url: safeUrl })
  return { opened: true }
}

async function serialized(key, task) {
  const previous = locks.get(key) ?? Promise.resolve()
  const current = previous.catch(() => {}).then(task)
  locks.set(key, current)
  try {
    return await current
  } finally {
    if (locks.get(key) === current) locks.delete(key)
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const task = request.type === "OPEN_DOCUMENT"
    ? () => openOrCreateDocument(request.context)
    : request.type === "REFLECT_DOCUMENT"
      ? () => serialized(`reflect:${request.documentId}`, () => reflectDocument(request.documentId))
      : request.type === "INSPECT_DOCUMENT"
        ? () => inspectDocument(request.documentId)
        : request.type === "OPEN_GMAIL"
          ? () => openGmail(request.url)
      : null
  if (!task) return false
  task().then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: publicError(error) }))
  return true
})
