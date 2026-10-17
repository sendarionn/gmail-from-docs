import { readFile, access } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"))
const files = [
  manifest.background.service_worker,
  manifest.options_page,
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...(entry.css ?? [])])
]
await Promise.all(files.map((file) => access(resolve(root, file))))

if (manifest.manifest_version !== 3) throw new Error("Manifest V3ではありません")
if (manifest.name !== "gmail-from-docs") throw new Error("拡張機能名がリポジトリ名と一致しません")
console.log(`${files.length}件の参照ファイルを確認しました`)
