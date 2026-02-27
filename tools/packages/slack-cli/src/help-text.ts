/** CLI ヘルプ表示用のテキスト（showHelp で使用） */
export const helpText = {
  usage: "slack-cli <Slack API メソッド名> [options]",
  "Slack API メソッド名（ドット表記）": [
    "search.messages [options]     - メッセージ検索 (User Token)",
    "conversations.list            - 会話一覧",
    "conversations.history [options] - 会話（チャンネル）のメッセージ履歴取得",
    "chat.postMessage [options]    - メッセージ投稿",
  ],
  commands: [
    "search.messages --query <string> [--count N] [--highlight] [--page N] [--cursor C] [--sort score|timestamp] [--sort_dir asc|desc] [--team_id T]",
    "conversations.list",
    "conversations.history --channel <id> [--oldest <ts>] [--latest <ts>] [--limit N] [--cursor C] [--inclusive] [--include_all_metadata]",
    "chat.postMessage --channel <id> --text <msg>",
  ],
  "search.messages options (see https://docs.slack.dev/reference/methods/search.messages/)": [
    "--query (required), --count (max 100), --highlight, --page, --cursor, --sort (score|timestamp), --sort_dir (asc|desc), --team_id",
  ],
  "search query syntax": [
    "mentions:USER_ID, from:<@USER_ID>, in:#channel, keyword. 例: search.messages --query 'mentions:W01234' --count 50 --sort timestamp",
  ],
  env: "SLACK_BOT_TOKEN, SLACK_USER_TOKEN, or SLACK_TOKEN. search.messages は User Token. SLACK_API_BASE_URL (optional)",
};
