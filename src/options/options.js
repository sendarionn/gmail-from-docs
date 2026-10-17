document.getElementById("authorize").addEventListener("click", async () => {
  const status = document.getElementById("status")
  status.textContent = "認証中"
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true })
    status.textContent = result ? "認証済み" : "認証できませんでした"
  } catch (error) {
    status.textContent = `認証に失敗しました: ${error.message}`
  }
})
