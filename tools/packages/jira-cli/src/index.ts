#!/usr/bin/env node
import minimist from "minimist";
import { getBaseUrl, getAuthHeader, projectsList, issueGet, searchJql } from "./api.js";
import { helpText } from "./help-text.js";
import type { CliArgs } from "./schemas.js";
import { safeParseArgs } from "./schemas.js";

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
}

function showHelp(): void {
  out(helpText);
}

function err(msg: string | Error): never {
  if (msg instanceof Error) {
    console.error(msg.message);
    if (msg.stack) {
      console.error(msg.stack);
    }
  } else {
    console.error(msg);
  }
  process.exit(1);
}

function toKind(sub: string, cmd: string | undefined): CliArgs["kind"] | null {
  if (sub === "projects" && cmd === "list") return "projects.list";
  if (sub === "issue" && cmd === "get") return "issue.get";
  if (sub === "search") return "search";
  return null;
}

export type JiraClientOpt = { baseUrl: string; auth: string };

type Parsed = ({ kind: "help" } & JiraClientOpt) | (CliArgs & JiraClientOpt);

function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2));
  const [sub, cmd, ...rest] = argv._ as string[];

  if (!sub || sub === "help" || argv.help || argv.h) {
    const baseUrl = getBaseUrl();
    const auth = getAuthHeader();
    return { kind: "help", baseUrl: baseUrl ?? "", auth: auth ?? "" };
  }

  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();
  if (!baseUrl || !auth) {
    err("JIRA_BASE_URL, JIRA_USER, and JIRA_TOKEN must be set");
  }

  const common: JiraClientOpt = { baseUrl, auth };

  const kind = toKind(sub, cmd);
  if (!kind) {
    err(`Unknown command: ${sub} ${cmd ?? ""}. Use 'help' for usage.`);
  }

  const raw: Record<string, unknown> = {
    kind,
    key: argv.key ?? rest[0],
    jql: (argv.jql ?? rest.join(" ").trim()) || undefined,
  };

  const data = safeParseArgs(raw);
  return { ...data, ...common };
}

async function run(parsed: Parsed): Promise<void> {
  const { baseUrl, auth } = parsed;

  switch (parsed.kind) {
    case "help":
      return showHelp();

    case "projects.list": {
      const data = await projectsList(baseUrl, auth);
      return out(data);
    }

    case "issue.get": {
      const data = await issueGet(baseUrl, auth, parsed.key);
      return out(data);
    }

    case "search": {
      const data = await searchJql(baseUrl, auth, parsed.jql);
      return out(data);
    }

    default: {
      return err("Unknown command. Use 'help' for usage.");
    }
  }
}

(async (): Promise<void> => {
  const args = parseArgs();
  await run(args);
})().catch((e) => err(e));
