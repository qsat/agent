# tools

Slack / Confluence / Jira 用の CLI。OpenClaw のスキルから `exec` で呼び出す想定。TypeScript で実装し、tsup で 1 本の JS にバンドルする。

## ビルド

```bash
cd tools
npm install
npm run build
```

各パッケージの `dist/index.js` が生成される。

## ホストでの実行

環境変数は `.env` で管理する。プロジェクトルートで:

```bash
# .env を読み込んで実行（例: zsh）
set -a && source .env && set +a
node tools/packages/slack-cli/dist/index.js channels list
```

または `dotenv` で読み込んでから実行する:

```bash
node -r dotenv/config tools/packages/slack-cli/dist/index.js channels list
```

（プロジェクトルートに `dotenv` を入れ、`dotenv/config` が `.env` を読む前提。別の方法として `env $(grep -v '^#' .env | xargs)` で子プロセスに渡してもよい。）

### 各 CLI の環境変数

| CLI | 環境変数 |
|-----|----------|
| slack-cli | `SLACK_BOT_TOKEN` または `SLACK_TOKEN` |
| confluence-cli | `CONFLUENCE_BASE_URL`, `CONFLUENCE_USER`, `CONFLUENCE_TOKEN` |
| jira-cli | `JIRA_BASE_URL`, `JIRA_USER`, `JIRA_TOKEN` |

### 実行例

```bash
# ヘルプ（トークン不要）
node packages/slack-cli/dist/index.js help
node packages/confluence-cli/dist/index.js help
node packages/jira-cli/dist/index.js help

# 読み取り（トークン・BASE_URL を設定してから）
node packages/slack-cli/dist/index.js channels list
node packages/confluence-cli/dist/index.js spaces list
node packages/jira-cli/dist/index.js projects list

# 書き込みは --confirm なしだと dry-run（予定内容を JSON で出力）
node packages/slack-cli/dist/index.js post --channel C123 --text "hello"
# 実行するときは --confirm を付ける
node packages/slack-cli/dist/index.js post --channel C123 --text "hello" --confirm
```

## ユーザーレビュー（--confirm）

書き込み系のコマンドは、`--confirm` を付けない限り **実行せず**、これから行う操作の内容を JSON で stdout に出す。ユーザーが内容を確認し、問題なければ同じコマンドに `--confirm` を付けて再実行する。

## パッケージ

- **slack-cli**: チャンネル一覧、会話一覧、メッセージ投稿（post は --confirm で実行）
- **confluence-cli**: スペース一覧、ページ取得、CQL 検索、ページ作成（create は --confirm で実行）
- **jira-cli**: プロジェクト一覧、issue 取得、JQL 検索、issue 作成（create は --confirm で実行）
