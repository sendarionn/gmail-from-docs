import test from "node:test"
import assert from "node:assert/strict"
import { buildReplyRaw, normalizeSubject } from "../src/lib/message.js"

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)))
}

test("返信件名のReを重複させない", () => {
  assert.equal(normalizeSubject("質問"), "Re: 質問")
  assert.equal(normalizeSubject("Re: 質問"), "Re: 質問")
})

test("返信に必要なヘッダーと管理ヘッダーを設定する", () => {
  const raw = decodeBase64Url(buildReplyRaw({
    to: "customer@example.com",
    subject: "質問",
    messageId: "<source@example.com>",
    references: "<first@example.com>",
    body: "回答です",
    documentId: "doc-1"
  }))
  assert.match(raw, /In-Reply-To: <source@example.com>/)
  assert.match(raw, /References: <first@example.com> <source@example.com>/)
  assert.match(raw, /X-Gmail-From-Docs-Document-Id: doc-1/)
  assert.match(raw, /\r\n\r\n回答です$/)
})

test("メール由来の改行をヘッダーへ挿入しない", () => {
  const raw = decodeBase64Url(buildReplyRaw({
    to: "customer@example.com\r\nBcc: attacker@example.com",
    subject: "質問\nX-Injected: yes",
    messageId: "<source@example.com>",
    body: "回答",
    documentId: "doc-1"
  }))
  assert.doesNotMatch(raw, /\r\nBcc:/)
  assert.doesNotMatch(raw, /\r\nX-Injected:/)
})
