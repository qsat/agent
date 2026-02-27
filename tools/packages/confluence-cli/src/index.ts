#!/usr/bin/env node
import minimist from "minimist";
import { spacesList, pageGet, searchCql, ConfluenceClientOpt } from "./api.js";
import { helpText } from "./help-text.js";
import type { CliArgs } from "./schemas.js";
import { safeParseArgs, safeParseKind } from "./schemas.js";

const out = (o: unknown) => console.log(JSON.stringify(o));

const showHelp = () => out(helpText);

function err(e: string | Error): never {
  if (e instanceof Error) console.error(e.stack || e.message);
  else console.error(e);
  process.exit(1);
}

function getOpt(): ConfluenceClientOpt {
  const base = process.env.CONFLUENCE_BASE_URL;
  if (!base) err("CONFLUENCE_BASE_URL must be set");
  const user = process.env.CONFLUENCE_USER;
  if (!user) err("CONFLUENCE_USER must be set");
  const token = process.env.CONFLUENCE_TOKEN;
  if (!token) err("CONFLUENCE_TOKEN must be set");
  return {
    baseUrl: base.replace(/\/$/, ""),
    auth: { user, token },
  };
}

type Parsed = { kind: "help" } | (CliArgs & ConfluenceClientOpt);

function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2));
  const [sub, cmd] = argv._ as string[];

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help" };
  }

  const common: ConfluenceClientOpt = getOpt();
  const kindStr = cmd ? `${sub}.${cmd}` : sub;
  const kind = safeParseKind(kindStr);
  const [, , ...rest] = argv._ as string[];
  const raw: Record<string, unknown> = {
    ...argv,
    kind,
    id: argv.id ?? rest[0],
    cql: argv.cql ?? (rest.length ? rest.join(" ") : undefined),
  };
  return { ...safeParseArgs(raw), ...common };
}

async function run(parsed: Parsed): Promise<void> {
  switch (parsed.kind) {
    case "help":
      return showHelp();

    case "spaces.list": {
      return out(await spacesList(parsed));
    }

    case "page.get": {
      return out(await pageGet(parsed.id, parsed));
    }

    case "search": {
      return out(await searchCql(parsed.cql, parsed));
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
