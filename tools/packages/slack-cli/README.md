# slack-cli

Slack API を叩く CLI。チャンネル一覧・会話一覧の取得とメッセージ投稿ができる。OpenClaw のスキルから `exec` で呼ぶ想定。

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `SLACK_BOT_TOKEN` | どちらか | Bot Token（`xoxb-...`）。チャンネル一覧・投稿・reactions などで利用。 |
| `SLACK_USER_TOKEN` | どちらか | User Token（`xoxp-...`）。**search（メッセージ検索）で利用。** `search:read` が必要。 |
| `SLACK_TOKEN` | どちらか | 上記のどちらか一方だけ設定する場合はこれでも可。 |
| `SLACK_API_BASE_URL` | いいえ | API のベース URL。未設定時は `https://slack.com/api` |

**両方設定する場合**: search は `SLACK_USER_TOKEN`（または `SLACK_TOKEN`）を、それ以外のコマンドは `SLACK_BOT_TOKEN` を優先して使います。

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
# または SLACK_USER_TOKEN / SLACK_TOKEN でも可
node dist/index.js channels list
```

出力は JSON（`channels` 配列）。

### 会話一覧（チャンネル + DM）

```bash
node dist/index.js conversations list
```

### メッセージ検索（search）

Slack の検索構文でメッセージを検索する。**User Token** と `search:read` スコープが必要。自分へのメンションは `mentions:USER_ID` で検索する（USER_ID は `auth.test` やプロフィールで確認）。

```bash
export SLACK_USER_TOKEN=xoxp-...
# 自分宛メンション（USER_ID を自分の ID に置き換え）
node dist/index.js search --query "mentions:W01234567" --count 20
# キーワード検索
node dist/index.js search --query "keyword" --count 50
```

検索クエリの例: `mentions:USER_ID`（そのユーザーへのメンション）、`from:<@USER_ID>`（そのユーザーが送ったメッセージ）、`in:#channel`（チャンネルで絞り込み）。`help` で一覧を表示。

### Bot へのメンション

Bot をメンションしているメッセージを、Bot が参加しているチャンネルの履歴から収集する。**Bot Token** を使用。

```bash
export SLACK_BOT_TOKEN=xoxb-...
node dist/index.js mentions-bot --oldest 1508284197.000015 --latest 1508360597.000000
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

# または env で渡す（Bot / User のどちらでも可）
SLACK_BOT_TOKEN=xoxb-... node packages/slack-cli/dist/index.js channels list
SLACK_USER_TOKEN=xoxp-... node packages/slack-cli/dist/index.js search --query "mentions:W01234567" --count 20
```

## プログラムから利用する場合

`api.ts` では **slackUserClient**（User Token 用）と **slackBotClient**（Bot Token 用）を export している。いずれも `process.env` に依存せず、`token` と `baseUrl` を渡す。

- **slackUserClient(opt)** … `search({ query, count? })`（メッセージ検索。自分宛メンションは `query: "mentions:USER_ID"`）。token には `xoxp-...` を渡す。
- **slackBotClient(opt)** … チャンネル一覧・投稿・履歴・`getMentionsToBot`（Bot 宛メンション収集）など。token には `xoxb-...` を渡す。

**特定の期間のメッセージを取得する**: `getChannelHistory` で `oldest` と `latest`（Unix ts 文字列）を必須で指定する。

```ts
import { slackUserClient, slackBotClient } from "./api.js";

const bot = slackBotClient({
  token: "xoxb-...",
  baseUrl: "https://slack.com/api",
});
const channels = await bot.listChannels();
await bot.postMessage("C01234567", "Hello");

const history = await bot.getChannelHistory({
  channel: "C01234567",
  oldest: "1508284197.000015",
  latest: "1508360597.000000",
  limit: 50,
});

const user = slackUserClient({ token: "xoxp-...", baseUrl: "https://slack.com/api" });
const searchResult = await user.search({
  query: "mentions:W01234567",
  count: 20,
});

const botMentions = await bot.getMentionsToBot({
  oldest: "1508284197.000015",
  latest: "1508360597.000000",
}); // Bot へのメンション（参加チャンネルから収集）
```

# SCOPE

search:read
ワークスペースのコンテンツを検索する
channels:history
ユーザーのパブリックチャンネルでメッセージやその他のコンテンツにアクセスする
channels:read
ワークスペースのパブリックチャンネルに関する基本情報にアクセスする
im:history
ユーザーのダイレクトメッセージでメッセージやその他のコンテンツにアクセスする
im:read
ユーザーのダイレクトメッセージに関する基本情報にアクセスする
mpim:history
ユーザーのグループ DM でメッセージやその他のコンテンツにアクセスする
mpim:read
ユーザーのグループ DM に関する基本情報にアクセスする
search:read.im
ワークスペースのコンテンツをダイレクトメッセージ内で検索する
search:read.mpim
ワークスペースのコンテンツをグループダイレクトメッセージ内で検索する
search:read.public
ワークスペースのコンテンツをパブリックチャンネル内で検索する
search:read.private
ワークスペースのコンテンツをプライベートチャンネル内で検索する
search:read.users
ワークスペースのユーザーを検索する
chat:write
ユーザーに代わりメッセージを送信する
groups:history
ユーザーのプライベートチャンネルでメッセージやその他のコンテンツにアクセスする
