export const REPLY_START = "[[GMAIL_FROM_DOCS_REPLY_START]]"
export const REPLY_END = "[[GMAIL_FROM_DOCS_REPLY_END]]"

export function createDocumentText({ subject, from, gmailUrl, sourceText }) {
  return [
    `件名: ${subject}`,
    `送信者: ${from}`,
    `Gmail: ${gmailUrl}`,
    "",
    "返信文",
    REPLY_START,
    "ここに返信文を入力",
    REPLY_END,
    "",
    "社内メモ",
    "回答方針や判断根拠を記入",
    "",
    "元メール",
    sourceText
  ].join("\n")
}

export function flattenDocumentText(document) {
  return (document.body?.content ?? [])
    .flatMap((block) => block.paragraph?.elements ?? [])
    .map((element) => element.textRun?.content ?? "")
    .join("")
}

export function extractReplyText(document) {
  const text = typeof document === "string" ? document : flattenDocumentText(document)
  const start = text.indexOf(REPLY_START)
  const end = text.indexOf(REPLY_END, start + REPLY_START.length)

  if (start < 0 || end < 0 || end < start) {
    throw new Error("返信文の区切りが見つかりません")
  }

  return text.slice(start + REPLY_START.length, end).trim()
}
