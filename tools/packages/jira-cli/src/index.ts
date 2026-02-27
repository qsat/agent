#!/usr/bin/env node
import minimist from "minimist";
import { projectsList, issueGet, searchJql } from "./api.js";
import { helpText } from "./help-text.js";
import type { CliArgs } from "./schemas.js";
import { safeParseArgs, safeParseKind } from "./schemas.js";

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
}

function showHelp() {
  out(helpText);
}

function err(msg: string | Error): never {
  if (msg instanceof Error) console.error(msg.stack || msg.message);
  else console.error(msg);
  process.exit(1);
}

function getOpt(): JiraClientOpt {
  const base = process.env.JIRA_BASE_URL;
  if (!base) err("JIRA_BASE_URL must be set");
  const user = process.env.JIRA_USER;
  if (!user) err("JIRA_USER must be set");
  const token = process.env.JIRA_TOKEN;
  if (!token) err("JIRA_TOKEN must be set");
  return { baseUrl: base.replace(/\/$/, ""), user, token };
}

export type JiraClientOpt = { baseUrl: string; user: string; token: string };

type Parsed = { kind: "help" } | (CliArgs & JiraClientOpt);

function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2));
  const [sub, cmd, ...rest] = argv._ as string[];

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help" };
  }

  const common: JiraClientOpt = getOpt();
  const kindStr = cmd ? `${sub}.${cmd}` : sub;
  const kind = safeParseKind(kindStr);
  const raw: Record<string, unknown> = {
    ...argv,
    kind,
    key: argv.key ?? rest[0],
    jql: (argv.jql ?? rest.join(" ").trim()) || undefined,
  };
  return { ...safeParseArgs(raw), ...common };
}

async function run(parsed: Parsed): Promise<void> {
  switch (parsed.kind) {
    case "help":
      return showHelp();

    case "projects.list": {
      const data = await projectsList(parsed);
      return out(data);
    }

    case "issue.get": {
      const { key, ...opt } = parsed;
      const data = await issueGet(opt, key);
      return out(data);
    }

    case "search": {
      const { jql, ...opt } = parsed;
      const data = await searchJql(opt, jql);
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
