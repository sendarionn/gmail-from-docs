(() => {
  const BUTTON_ID = "gmail-from-docs-create"
  let scanQueued = false

  function status(message) {
    document.querySelector(".gmail-from-docs-status")?.remove()
    const node = document.createElement("div")
    node.className = "gmail-from-docs-status"
    node.textContent = message
    document.body.append(node)
    setTimeout(() => node.remove(), 6000)
  }

  function visible(element) {
    return element && element.getClientRects().length > 0
  }

  function findOpenMessage() {
    const candidates = [...document.querySelectorAll("[data-legacy-message-id]")].filter(visible)
    const container = candidates.at(-1)
    if (!container) return null
    const body = container.querySelector(".a3s")
    const subject = document.querySelector("h2.hP")?.textContent?.trim()
    const sender = container.querySelector("[email]")?.getAttribute("email") || container.querySelector(".gD")?.textContent?.trim()
    if (!body || !subject || !sender) return null
    return {
      messageId: container.getAttribute("data-legacy-message-id"),
      subject,
      from: sender,
      sourceText: body.innerText.trim(),
      gmailUrl: location.href
    }
  }

  function findReplyArea() {
    const selectors = ["[data-tooltip^='返信']", "[data-tooltip^='Reply']", "div[role='button'][aria-label^='返信']", "div[role='button'][aria-label^='Reply']"]
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)]).find(visible)?.parentElement ?? null
  }

  async function onClick(event) {
    const button = event.currentTarget
    const context = findOpenMessage()
    if (!context) return status("開いているメールを識別できません")
    button.disabled = true
    button.textContent = "処理中"
    try {
      const response = await chrome.runtime.sendMessage({ type: "OPEN_DOCUMENT", context })
      if (!response.ok) throw response.error
      window.open(response.data.url, "_blank", "noopener")
      status(response.data.reused ? "既存のDocsを開きました" : "Docsを作成しました")
    } catch (error) {
      status(`${error.message ?? "処理に失敗しました"}${error.action ? `\n${error.action}` : ""}`)
    } finally {
      button.disabled = false
      button.textContent = "Docsで返信文を作成"
    }
  }

  function scan() {
    scanQueued = false
    const existing = document.getElementById(BUTTON_ID)
    const context = findOpenMessage()
    const area = findReplyArea()
    if (!context || !area) return existing?.remove()
    if (existing?.isConnected) return
    const button = document.createElement("button")
    button.id = BUTTON_ID
    button.className = "gmail-from-docs-button"
    button.type = "button"
    button.textContent = "Docsで返信文を作成"
    button.addEventListener("click", onClick)
    area.append(button)
  }

  const observer = new MutationObserver(() => {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  scan()
})()
