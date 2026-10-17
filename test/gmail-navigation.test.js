import test from "node:test"
import assert from "node:assert/strict"
import {
  gmailDraftsUrl,
  gmailUrlFromProperties,
  gmailUrlProperties,
  resolveGmailNavigation,
  validateGmailNavigationUrl,
  validateGmailThreadUrl
} from "../src/lib/gmail-navigation.js"

test("Gmailから取得した元スレッドURLを分割保存して復元する", () => {
  const original = "https://mail.google.com/mail/u/2/#inbox/FMfcgzQZSabc123"
  const properties = gmailUrlProperties(original)
  assert.equal(gmailUrlFromProperties(properties), original)
  assert.equal(resolveGmailNavigation(properties, "owner@example.com").destination, "thread")
})

test("Gmail APIのthreadIdからWeb UIのURLを生成しない", () => {
  const navigation = resolveGmailNavigation({ gmailFromDocsThreadId: "18f-api-thread-id" }, "owner@example.com")
  assert.equal(navigation.destination, "drafts")
  assert.equal(navigation.url, "https://mail.google.com/mail/?authuser=owner%40example.com#drafts")
  assert.doesNotMatch(navigation.url, /18f-api-thread-id/)
})

test("Gmail以外のURLと下書き画面URLを拒否する", () => {
  assert.equal(validateGmailThreadUrl("https://example.com/mail/u/0/#inbox/id"), null)
  assert.equal(validateGmailThreadUrl("https://mail.google.com/mail/u/0/#drafts"), null)
  assert.deepEqual(gmailUrlProperties("javascript:alert(1)"), {})
})

test("フォールバックURLはアカウントをメールアドレスで指定する", () => {
  assert.equal(gmailDraftsUrl("owner+test@example.com"), "https://mail.google.com/mail/?authuser=owner%2Btest%40example.com#drafts")
})

test("画面遷移はGmailのHTTPS URLだけを許可する", () => {
  assert.equal(validateGmailNavigationUrl("https://mail.google.com/mail/u/0/#inbox/id"), "https://mail.google.com/mail/u/0/#inbox/id")
  assert.equal(validateGmailNavigationUrl("https://example.com/mail/u/0/#inbox/id"), null)
  assert.equal(validateGmailNavigationUrl("javascript:alert(1)"), null)
})
