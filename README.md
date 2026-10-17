# gmail-from-docs

Gmailの返信文をGoogle Docsで共同編集し、元スレッドの返信下書きへ反映するChrome拡張機能

この拡張機能はCodexを使用して開発しました

## 現在の実装

- Gmailで開いているメールに「Docsで返信文を作成」を追加
- 元メールを含むDocsの作成と既存Docsの再利用
- Drive `appProperties`による対応関係の保存
- Docsの返信領域だけをGmail下書きへ反映
- 既存の管理対象下書きを再利用して更新
- メール担当者以外のGmailアカウントからの反映を拒否
- Gmail APIのスレッドIDを画面URLへ流用せず、保存した元Gmail URLへ戻る

## Google Cloudの設定

1. Google Cloud Consoleでプロジェクトを作成する
2. Gmail API、Google Drive API、Google Docs APIを有効にする
3. Google Auth PlatformでOAuth同意画面を設定する
4. Workspace内部利用なら対象ユーザータイプを「内部」にする
5. データアクセスに`gmail.readonly`、`gmail.compose`、`drive.file`、`documents`を追加する
6. `chrome://extensions/`でデベロッパーモードを有効にする
7. このフォルダを「パッケージ化されていない拡張機能を読み込む」で選択する
8. 表示された拡張機能IDを控える
9. OAuthクライアントを「Chrome拡張機能」で作成し、拡張機能IDを指定する
10. [manifest.json](manifest.json)の`oauth2.client_id`を発行された値へ置き換える
11. `chrome://extensions/`で拡張機能を再読み込みする
12. 拡張機能の「詳細」から「拡張機能のオプション」を開く
13. 「Googleアカウントを認証」を押し、権限を許可する

トークンやメール本文は外部サーバーへ送信せず、Google APIとの通信だけに使用する

## 利用手順

1. Gmailで対象メールを開く
2. 「Docsで返信文を作成」を押すと、新規または既存のDocsが別タブで開く
3. `[[GMAIL_FROM_DOCS_REPLY_START]]`と`[[GMAIL_FROM_DOCS_REPLY_END]]`の間を共同編集する
4. Docs右上の「Gmailに反映」を押すと、元スレッドに下書きが作成または更新される
5. 開いたGmailで宛先と本文を確認して送信する

区切りマーカーを削除すると反映を停止する

## テスト

```sh
npm test
npm run check
```

Chrome実機確認は[実機テスト手順](docs/manual-test.md)に従う

## 社内配布

- 少人数の検証では各端末でデベロッパーモードからローカル読み込みする
- 継続利用ではChrome Web Storeの「非公開」でWorkspaceドメインへ配布する
- 管理者は管理コンソールの「デバイス → Chrome → アプリと拡張機能」で許可または強制インストールを設定する
- 管理者はGoogle APIのアクセス制御でOAuthクライアントIDと要求スコープを許可する
- 公開方法にかかわらずChrome Web Storeの審査対象になる場合がある

## 制約

- GmailとDocsへのボタン挿入は非公開DOMに依存する
- 初期版はプレーンテキストだけを反映する
- 直近100件を超えて古い管理対象下書きは自動検出できない
- 共有フォルダの指定UIは未実装
- Google Workspaceの管理ポリシーにより認証やAPI利用が拒否される場合がある

調査根拠と未確認事項は[実現可能性と制約](docs/feasibility.md)を参照
