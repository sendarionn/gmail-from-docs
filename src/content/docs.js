(() => {
  const BUTTON_ID = "gmail-from-docs-reflect"
  const match = location.pathname.match(/^\/document\/d\/([^/]+)/)
  if (!match) return
  const documentId = match[1]

  function status(message) {
    document.querySelector(".gmail-from-docs-status")?.remove()
    const node = document.createElement("div")
    node.className = "gmail-from-docs-status"
    node.textContent = message
    document.body.append(node)
    setTimeout(() => node.remove(), 8000)
  }

  async function reflect(event) {
    const button = event.currentTarget
    button.disabled = true
    button.textContent = "反映中"
    try {
      const response = await chrome.runtime.sendMessage({ type: "REFLECT_DOCUMENT", documentId })
      if (!response.ok) throw response.error
      status(response.data.updated ? "Gmailの下書きを更新しました" : "Gmailに下書きを作成しました")
      window.open(response.data.gmailUrl, "_blank", "noopener")
    } catch (error) {
      status(`${error.message ?? "反映に失敗しました"}${error.action ? `\n${error.action}` : ""}`)
    } finally {
      button.disabled = false
      button.textContent = "Gmailに反映"
    }
  }

  async function addButton() {
    if (document.getElementById(BUTTON_ID)) return
    const inspection = await chrome.runtime.sendMessage({ type: "INSPECT_DOCUMENT", documentId }).catch(() => null)
    if (!inspection?.ok || !inspection.data.managed) return
    const button = document.createElement("button")
    button.id = BUTTON_ID
    button.className = "gmail-from-docs-button gmail-from-docs-docs-button"
    button.type = "button"
    button.textContent = "Gmailに反映"
    button.addEventListener("click", reflect)
    document.body.append(button)
  }
  addButton()
})()
