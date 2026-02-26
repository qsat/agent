# slack-cli

Slack API を叩く CLI。チャンネル一覧・会話一覧の取得とメッセージ投稿ができる。OpenClaw のスキルから `exec` で呼ぶ想定。

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `SLACK_BOT_TOKEN` または `SLACK_TOKEN` | はい | Slack Bot Token（`xoxb-...`） |
| `SLACK_API_BASE_URL` | いいえ | API のベース URL。未設定時は `https://slack.com/api` |

## ビルド

```bash
# tools ルートで
cd tools
npm install
npm run build -w slack-cli
```

成果物: `dist/index.js`

## 使い方

### ヘルプ（トークン不要）

```bash
node dist/index.js help
# または
node dist/index.js
```

### チャンネル一覧

```bash
export SLACK_BOT_TOKEN=xoxb-...
node dist/index.js channels list
```

出力は JSON（`channels` 配列）。

### 会話一覧（チャンネル + DM）

```bash
node dist/index.js conversations list
```

### 自分へのメンション

自分をメンションしているメッセージを検索する。**User token** と `search:read` スコープが必要（Bot token では利用できない）。

```bash
node dist/index.js mentions
```

### 自分のメッセージへのリアクション

自分が投稿したメッセージのうち、誰かがリアクションを付けたものを一覧する。参加中のチャンネル・DM の直近履歴から収集する。

```bash
node dist/index.js reactions
```

### メッセージ投稿

**書き込みはユーザー確認必須。** まず `--confirm` を付けずに実行すると、実行予定の内容だけが JSON で出る（dry-run）。内容を確認し、問題なければ同じコマンドに `--confirm` を付けて再実行する。

```bash
# dry-run（投稿はせず、予定内容を表示）
node dist/index.js post --channel C01234567 --text "Hello"

# 実際に投稿する
node dist/index.js post --channel C01234567 --text "Hello" --confirm
```

## 実行例（tools ルートから）

```bash
# .env を読み込んでから
set -a && source .env && set +a
node packages/slack-cli/dist/index.js channels list

# または env で渡す
SLACK_BOT_TOKEN=xoxb-... node packages/slack-cli/dist/index.js channels list
```

## プログラムから利用する場合

`api.ts` の `slackClient(opt)` は `process.env` に依存しない。トークンとオプションでベース URL を渡す。

**特定のメッセージより後のメッセージを取得する**: `getChannelHistory` の `oldest` に、基準にしたいメッセージの `ts`（例: `"1508284197.000015"`）を指定する。`latest` で「この ts より前」に絞ることもできる。

```ts
import { slackClient } from "./api.js";

const client = slackClient({
  token: "xoxb-...",
  baseUrl: "https://slack.com/api", // 省略時はこのデフォルト
});

const channels = await client.listChannels();
const result = await client.postMessage("C01234567", "Hello");

// 特定メッセージ（ts）より後のメッセージを取得
const history = await client.getChannelHistory({
  channel: "C01234567",
  oldest: "1508284197.000015",
  limit: 50,
});
```
