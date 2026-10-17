import { apiFetch } from "./google-api.js"
import { AppError } from "../lib/errors.js"
import { buildReplyRaw, headerValue } from "../lib/message.js"
import { createDocumentText, extractReplyText } from "../lib/document-format.js"
import { gmailUrlProperties, resolveGmailNavigation } from "../lib/gmail-navigation.js"

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
const DOCS = "https://docs.googleapis.com/v1/documents"
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me"

function escapeDriveQuery(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

async function getMessage(messageId) {
  return apiFetch(`${GMAIL}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Message-ID&metadataHeaders=References`)
}

async function findDocument(threadId, ownerEmail) {
  const q = [
    "trashed = false",
    "mimeType = 'application/vnd.google-apps.document'",
    `appProperties has { key='gmailFromDocsThreadId' and value='${escapeDriveQuery(threadId)}' }`,
    `appProperties has { key='gmailFromDocsOwner' and value='${escapeDriveQuery(ownerEmail)}' }`
  ].join(" and ")
  const result = await apiFetch(`${DRIVE_FILES}?q=${encodeURIComponent(q)}&fields=files(id,name,appProperties)&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`)
  return result.files?.[0] ?? null
}

async function createDocument(context, message, ownerEmail) {
  const headers = message.payload?.headers ?? []
  const subject = headerValue(headers, "Subject") || context.subject
  const from = headerValue(headers, "From") || context.from
  const doc = await apiFetch(DOCS, {
    method: "POST",
    interactive: true,
    body: JSON.stringify({ title: `返信案: ${subject}` })
  })
  const text = createDocumentText({ subject, from, gmailUrl: context.gmailUrl, sourceText: context.sourceText })
  await apiFetch(`${DOCS}/${doc.documentId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text } }] })
  })
  await apiFetch(`${DRIVE_FILES}/${doc.documentId}?supportsAllDrives=true`, {
    method: "PATCH",
    body: JSON.stringify({ appProperties: {
      gmailFromDocs: "v1",
      gmailFromDocsThreadId: message.threadId,
      gmailFromDocsMessageId: message.id,
      gmailFromDocsOwner: ownerEmail,
      ...gmailUrlProperties(context.gmailUrl)
    } })
  })
  return { id: doc.documentId }
}

export async function openOrCreateDocument(context) {
  if (!context.messageId) {
    throw new AppError("MESSAGE_NOT_FOUND", "開いているメールを識別できません", "メール本文を開き直してからお試しください")
  }
  const [message, profile] = await Promise.all([
    getMessage(context.messageId),
    apiFetch(`${GMAIL}/profile`, { interactive: true })
  ])
  const existing = await findDocument(message.threadId, profile.emailAddress)
  const document = existing ?? await createDocument(context, message, profile.emailAddress)
  if (existing) {
    const navigationProperties = gmailUrlProperties(context.gmailUrl)
    if (Object.keys(navigationProperties).length) {
      await apiFetch(`${DRIVE_FILES}/${existing.id}?supportsAllDrives=true`, {
        method: "PATCH",
        body: JSON.stringify({ appProperties: navigationProperties })
      })
    }
  }
  return { url: `https://docs.google.com/document/d/${document.id}/edit`, reused: Boolean(existing) }
}

async function fileMetadata(documentId) {
  return apiFetch(`${DRIVE_FILES}/${documentId}?fields=id,name,appProperties&supportsAllDrives=true`)
}

async function findManagedDraft(documentId) {
  const list = await apiFetch(`${GMAIL}/drafts?maxResults=100`)
  for (const item of list.drafts ?? []) {
    const draft = await apiFetch(`${GMAIL}/drafts/${item.id}?format=metadata&metadataHeaders=X-Gmail-From-Docs-Document-Id`)
    const headers = draft.message?.payload?.headers ?? []
    if (headerValue(headers, "X-Gmail-From-Docs-Document-Id") === documentId) return draft
  }
  return null
}

async function saveDraft({ draftId, threadId, raw }) {
  const body = JSON.stringify({ message: { threadId, raw } })
  if (draftId) return apiFetch(`${GMAIL}/drafts/${draftId}`, { method: "PUT", body })
  return apiFetch(`${GMAIL}/drafts`, { method: "POST", body })
}

export async function reflectDocument(documentId) {
  const [file, profile, document] = await Promise.all([
    fileMetadata(documentId),
    apiFetch(`${GMAIL}/profile`, { interactive: true }),
    apiFetch(`${DOCS}/${documentId}`)
  ])
  const properties = file.appProperties ?? {}
  if (properties.gmailFromDocs !== "v1") throw new AppError("NOT_MANAGED", "この文書は拡張機能で作成されていません", "Gmailのボタンから文書を開いてください")
  if (properties.gmailFromDocsOwner !== profile.emailAddress) throw new AppError("ACCOUNT_MISMATCH", "メール担当者のGoogleアカウントではありません", `${properties.gmailFromDocsOwner}でChromeにログインして実行してください`)

  const source = await getMessage(properties.gmailFromDocsMessageId)
  if (source.threadId !== properties.gmailFromDocsThreadId) throw new AppError("THREAD_MISMATCH", "保存されたスレッド情報が一致しません", "Gmailから文書を作り直してください")
  const headers = source.payload?.headers ?? []
  const messageId = headerValue(headers, "Message-ID")
  if (!messageId) throw new AppError("HEADER_MISSING", "元メールのMessage-IDを取得できません", "元メールの形式を確認してください")
  const reply = extractReplyText(document)
  if (!reply || reply === "ここに返信文を入力") throw new AppError("REPLY_EMPTY", "返信文が入力されていません", "返信文の区切り内に文章を入力してください")

  const existing = await findManagedDraft(documentId)
  const raw = buildReplyRaw({
    to: headerValue(headers, "Reply-To") || headerValue(headers, "From"),
    subject: headerValue(headers, "Subject"),
    messageId,
    references: headerValue(headers, "References"),
    body: reply,
    documentId
  })
  const draft = await saveDraft({ draftId: existing?.id, threadId: source.threadId, raw })
  if (!draft?.id || draft.message?.threadId !== source.threadId) {
    throw new AppError("DRAFT_NOT_CONFIRMED", "Gmail下書きの保存結果を確認できません", "Gmailの下書き一覧を確認してから再実行してください")
  }
  const navigation = resolveGmailNavigation(properties, profile.emailAddress)
  return {
    draftId: draft.id,
    threadId: draft.message.threadId,
    updated: Boolean(existing),
    gmailUrl: navigation.url,
    destination: navigation.destination
  }
}

export async function inspectDocument(documentId) {
  const file = await fileMetadata(documentId)
  return { managed: file.appProperties?.gmailFromDocs === "v1" }
}
