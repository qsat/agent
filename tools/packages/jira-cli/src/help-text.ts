/** CLI ヘルプ表示用のテキスト（showHelp で使用） */
export const helpText = {
  usage: "jira-cli <command> [options]",
  commands: [
    "projects list                   - list projects",
    "issue get <key>                 - get issue by key (e.g. PROJ-123)",
    "search --jql \"<jql>\"             - JQL search",
  ],
  env: "JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN を設定してください。未設定時はエラーになります。",
};
