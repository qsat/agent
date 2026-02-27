#!/usr/bin/env node
import minimist from "minimist";
import { getBaseUrl, getAuthHeader, spacesList, pageGet, searchCql } from "./api.js";
import { helpText } from "./help-text.js";
import type { CliArgs } from "./schemas.js";
import { safeParseArgs, safeParseKind } from "./schemas.js";

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
}

function showHelp(): void {
  out(helpText);
}

function err(msg: string | Error): never {
  if (msg instanceof Error) {
    console.error(msg.message);
    if (msg.stack) console.error(msg.stack);
  } else {
    console.error(msg);
  }
  process.exit(1);
}

export type ConfluenceClientOpt = { baseUrl: string; auth: string };

type Parsed =
  | ({ kind: "help" } & ConfluenceClientOpt)
  | (CliArgs & ConfluenceClientOpt);

function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2));
  const [sub, cmd] = argv._ as string[];
  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help", baseUrl: baseUrl ?? "", auth: auth ?? "" };
  }

  if (!baseUrl || !auth) {
    err(
      "CONFLUENCE_BASE_URL, CONFLUENCE_USER, and CONFLUENCE_TOKEN must be set",
    );
  }

  const common: ConfluenceClientOpt = { baseUrl, auth };
  const kind = safeParseKind([sub, cmd].join("."));
  return { ...safeParseArgs({ ...argv, kind }), ...common };
}

async function run(parsed: Parsed): Promise<void> {
  const { baseUrl, auth } = parsed;

  switch (parsed.kind) {
    case "help":
      return showHelp();

    case "spaces.list": {
      const data = await spacesList(baseUrl, auth);
      return out(data);
    }

    case "page.get": {
      const data = await pageGet(baseUrl, auth, parsed.id);
      return out(data);
    }

    case "search": {
      const data = await searchCql(baseUrl, auth, parsed.cql);
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
