import test from "node:test"
import assert from "node:assert/strict"
import { createDocumentText, extractReplyText, REPLY_END, REPLY_START } from "../src/lib/document-format.js"

test("返信領域だけを抽出する", () => {
  const text = createDocumentText({ subject: "質問", from: "customer@example.com", gmailUrl: "https://mail.google.com/", sourceText: "元メール本文" })
    .replace("ここに返信文を入力", "回答です\nよろしくお願いします")
  assert.equal(extractReplyText(text), "回答です\nよろしくお願いします")
})

test("元メールと社内メモを返信に含めない", () => {
  const text = `件名\n${REPLY_START}\n返信だけ\n${REPLY_END}\n社内メモ\n秘密\n元メール\n引用`
  assert.equal(extractReplyText(text), "返信だけ")
})

test("区切りが欠けた文書を拒否する", () => {
  assert.throws(() => extractReplyText("本文のみ"), /区切り/)
})
