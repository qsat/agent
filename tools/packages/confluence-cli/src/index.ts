#!/usr/bin/env node
import minimist from "minimist";
import { getBaseUrl, getAuthHeader, spacesList, pageGet, searchCql, pageCreate } from "./api.js";

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
      usage: "confluence-cli <command> [options]",
      commands: [
        "spaces list                      - list spaces",
        "page get <id>                    - get page by id",
        "search --cql \"<cql>\"             - CQL search",
        "page create --title X --spaceKey Y [--confirm] - create page (use --confirm to execute)",
      ],
      env: "CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_TOKEN",
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();
  if (!baseUrl || !auth) {
    err("CONFLUENCE_BASE_URL, CONFLUENCE_USER, and CONFLUENCE_TOKEN must be set");
  }

  if (sub === "spaces" && cmd === "list") {
    const data = await spacesList(baseUrl, auth);
    out(data);
    return;
  }

  if (sub === "page" && cmd === "get") {
    const id = argv.id ?? rest[0];
    if (!id) {
      err("Usage: page get <id>");
    }
    const data = await pageGet(baseUrl, auth, id);
    out(data);
    return;
  }

  if (sub === "search") {
    const cql = argv.cql ?? rest.join(" ");
    if (!cql) {
      err("Usage: search --cql \"<cql>\"");
    }
    const data = await searchCql(baseUrl, auth, cql);
    out(data);
    return;
  }

  if (sub === "page" && cmd === "create") {
    const title = argv.title ?? rest[0];
    const spaceKey = argv.spaceKey ?? argv.space ?? rest[1];
    const body = argv.body ?? rest[2] ?? "";
    if (!title || !spaceKey) {
      err("Usage: page create --title <title> --spaceKey <key> [--body <html>] [--confirm]");
    }
    const planned = { action: "page.create", title, spaceKey, body: body || "(empty)" };
    requireConfirm(argv, planned);
    const data = await pageCreate(baseUrl, auth, spaceKey, title, body || "<p></p>");
    out(data);
  }

  err(`Unknown command: ${sub} ${cmd ?? ""}. Use 'help' for usage.`);
}

main().catch((e) => {
  err(String(e));
});
