# 実現可能性と制約

調査日: 2026-10-17

## 確認できた仕様

- Chrome拡張機能用OAuthクライアントと`chrome.identity.getAuthToken`を使用できる
- Gmail APIの下書き作成は`gmail.compose`、元メール取得は`gmail.readonly`で実行できる
- Gmailスレッドへ参加させるには`threadId`、同じ件名、RFC 2822準拠の`References`と`In-Reply-To`が必要
- Docs APIは文書作成、本文取得、`batchUpdate`を提供する
- Drive APIの`appProperties`は認証済みの同じアプリだけが取得でき、検索条件にも使用できる
- Chrome Web Storeは公開、限定公開、非公開の配布方式を提供する
- Workspace管理者は拡張機能の許可、強制インストール、OAuthアプリのアクセス制御を行える

## 実装上の判断

- Gmail DOMの`data-legacy-message-id`からAPIのメッセージを取得し、API応答の`threadId`を正とする
- Gmail URLの識別子をAPIのスレッドIDとして使用しない
- Docs本文は固定の開始・終了マーカーで返信領域を区切る
- 対応情報と所有者メールアドレスをDriveの`appProperties`へ保存する
- 下書きには文書IDの独自ヘッダーを付け、Drive側の保存失敗やService Worker再起動後も既存下書きを再検出する
- 所有者と実行中Gmailアカウントが異なる場合は反映を拒否する

## 実機検証が必要な項目

- GmailとDocsのDOMセレクターは非公開仕様であり、対象Workspace環境の現在のUIで確認が必要
- `data-legacy-message-id`が全表示形式と複数アカウントで取得できるか確認が必要
- 共同編集者が同じOAuthクライアントを使った際の`drive.file`と`appProperties`の参照可否を対象Workspaceで確認が必要
- Docs APIは保存済み状態を返すため、ボタン押下直前の編集がAPIへ反映されるまでの遅延を確認する必要がある
- Gmailの独自ヘッダーが下書き取得時に保持されるか実アカウントで確認が必要
- 管理者のAPI制御、OAuthアプリ制御、Chrome Web Storeポリシーは組織設定ごとに確認が必要

## 公式資料

- [Chrome Identity APIとOAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [Chrome拡張機能のOAuth manifest](https://developer.chrome.com/docs/extensions/reference/manifest/oauth2)
- [Gmailのスレッド条件](https://developers.google.com/workspace/gmail/api/guides/threads)
- [Gmail下書きAPI](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts)
- [Docs APIの文書操作](https://developers.google.com/workspace/docs/api/concepts/document)
- [Driveカスタムプロパティ](https://developers.google.com/workspace/drive/api/guides/properties)
- [組織向けChrome拡張機能の公開](https://support.google.com/chrome/a/answer/2714278)
