/** CLI ヘルプ表示用のテキスト（showHelp で使用） */
export const helpText = {
  usage: "confluence-cli <command> [options]",
  commands: [
    "spaces list                      - list spaces",
    "page get <id>                    - get page by id",
    "search --cql \"<cql>\"             - CQL search",
    "user current                     - get current user (accountId, email, displayName)",
  ],
  "CQL examples (search --cql)": [
    "user current で accountId を取得してから search に渡す例:",
    "  更新したページ（最新順）:  search --cql 'contributor=\"<accountId>\" order by lastModified desc'",
    "  メンションされたページ（最新順）:  search --cql 'mention=\"<accountId>\" order by lastModified desc'",
    "  ページ一覧:  search --cql 'type=page'",
  ],
  env: "CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_TOKEN を設定してください。未設定時はエラーになります。",
};
