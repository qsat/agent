/** CLI ヘルプ表示用のテキスト（showHelp で使用） */
export const helpText = {
  usage: "confluence-cli <command> [options]",
  commands: [
    "spaces list                      - list spaces",
    "page get <id>                    - get page by id",
    "search --cql \"<cql>\"             - CQL search",
  ],
  env: "CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_TOKEN を設定してください。未設定時はエラーになります。",
};
