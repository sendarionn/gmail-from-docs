export class AppError extends Error {
  constructor(code, message, action = "") {
    super(message)
    this.name = "AppError"
    this.code = code
    this.action = action
  }
}

export function publicError(error) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, action: error.action }
  }

  return {
    code: "UNEXPECTED",
    message: "予期しないエラーが発生しました",
    action: "拡張機能を再読み込みして、もう一度お試しください"
  }
}
