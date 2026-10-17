import { AppError } from "../lib/errors.js"

export async function getToken(interactive = false) {
  try {
    const result = await chrome.identity.getAuthToken({ interactive })
    const token = typeof result === "string" ? result : result?.token
    if (!token) throw new Error("token missing")
    return token
  } catch {
    throw new AppError("AUTH_REQUIRED", "Googleアカウントの認証が必要です", "もう一度ボタンを押し、認証画面で許可してください")
  }
}

export async function apiFetch(url, options = {}, retry = true) {
  const token = await getToken(options.interactive ?? false)
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  })

  if (response.status === 401 && retry) {
    await chrome.identity.removeCachedAuthToken({ token })
    return apiFetch(url, options, false)
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    const reason = detail.error?.message ?? `${response.status} ${response.statusText}`
    throw new AppError("GOOGLE_API_ERROR", `Google API: ${reason}`, "権限と対象ファイルへのアクセスを確認してください")
  }

  if (response.status === 204) return null
  return response.json()
}
