#!/usr/bin/env node
import minimist from "minimist";
import { getBaseUrl, getAuthHeader, projectsList, issueGet, searchJql, issueCreate } from "./api.js";

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
}

function err(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function requireConfirm(args: Record<string, unknown>, planned: object): void {
  if (args.confirm) {
    return;
  }
  out({ _dryRun: true, _message: "Add --confirm to execute. Planned action:", ...planned });
  process.exit(0);
}

async function main() {
  const argv = minimist(process.argv.slice(2), { boolean: ["confirm"] });
  const [sub, cmd, ...rest] = argv._ as string[];

  if (!sub || sub === "help" || argv.help || argv.h) {
    out({
      usage: "jira-cli <command> [options]",
      commands: [
        "projects list                   - list projects",
        "issue get <key>                 - get issue by key (e.g. PROJ-123)",
        "search --jql \"<jql>\"             - JQL search",
        "issue create --project X --summary Y [--confirm] - create issue (use --confirm to execute)",
      ],
      env: "JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN",
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();
  if (!baseUrl || !auth) {
    err("JIRA_BASE_URL, JIRA_USER, and JIRA_TOKEN must be set");
  }

  if (sub === "projects" && cmd === "list") {
    const data = await projectsList(baseUrl, auth);
    out(data);
    return;
  }

  if (sub === "issue" && cmd === "get") {
    const key = argv.key ?? rest[0];
    if (!key) {
      err("Usage: issue get <issue-key>");
    }
    const data = await issueGet(baseUrl, auth, key);
    out(data);
    return;
  }

  if (sub === "search") {
    const jql = argv.jql ?? rest.join(" ");
    if (!jql) {
      err("Usage: search --jql \"<jql>\"");
    }
    const data = await searchJql(baseUrl, auth, jql);
    out(data);
    return;
  }

  if (sub === "issue" && cmd === "create") {
    const project = argv.project ?? rest[0];
    const summary = argv.summary ?? rest[1];
    if (!project || !summary) {
      err("Usage: issue create --project <key> --summary <text> [--confirm]");
    }
    const planned = { action: "issue.create", project, summary };
    requireConfirm(argv, planned);
    const data = await issueCreate(baseUrl, auth, project, summary);
    out(data);
  }

  err(`Unknown command: ${sub} ${cmd ?? ""}. Use 'help' for usage.`);
}

main().catch((e) => {
  err(String(e));
});
