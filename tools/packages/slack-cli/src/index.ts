import minimist from "minimist";
import { slackUserClient, slackBotClient } from "./api.js";
import type { SearchMessagesParams } from "./schemas.js";
import { safeParseSearchMessagesParams } from "./schemas.js";

/** メンション検索など User Token 向けコマンド用。SLACK_USER_TOKEN を優先。 */
function getTokenForUserScoped(): string | undefined {
  return process.env.SLACK_USER_TOKEN ?? "";
}

/** チャンネル一覧・投稿など Bot Token で十分なコマンド用。SLACK_BOT_TOKEN を優先。 */
function getTokenForBotScoped(): string | undefined {
  return process.env.SLACK_BOT_TOKEN ?? "";
}

/** コマンドに応じて使うトークンを返す。search は User Token、それ以外は Bot Token 優先。 */
function getToken(sub: string | undefined): string | undefined {
  if (sub === "search") return getTokenForUserScoped();
  return getTokenForBotScoped();
}

const SLACK_API_DEFAULT_BASE_URL = "https://slack.com/api";

function getSlackApiBaseUrl(): string {
  return process.env.SLACK_API_BASE_URL ?? SLACK_API_DEFAULT_BASE_URL;
}

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
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

type Parsed = (
  | { kind: "help" }
  | {
      kind: "channels";
      action: "list";
    }
  | {
      kind: "conversations";
      action: "list";
    }
  | {
      kind: "post";
      channel: string;
      text: string;
      confirm: boolean;
    }
  | ({ kind: "search" } & SearchMessagesParams)
  | { kind: "unknown"; sub: string; cmd: string }
) & {
  token: string;
  baseUrl: string;
  oldest?: string;
  latest?: string;
};

/**
 * コマンドライン引数をパース・チェックする。不正な場合は err() で終了する。
 */
function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2), { boolean: ["confirm"] });
  const [sub, cmd, ...rest] = argv._ as string[];
  const confirm = Boolean(argv.confirm);
  const oldest = argv.oldest ?? argv["oldest"];
  const latest = argv.latest ?? argv["latest"];
  const token = getToken(sub);
  const baseUrl = getSlackApiBaseUrl();
  if (!token) {
    err(
      "Set SLACK_BOT_TOKEN and/or SLACK_USER_TOKEN (or SLACK_TOKEN). search requires User Token.",
    );
  }

  const common = { token, baseUrl, oldest, latest };

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help", ...common };
  }

  if (sub === "channels" && cmd === "list") {
    return { kind: "channels", action: "list", ...common };
  }

  if (sub === "conversations" && cmd === "list") {
    return { kind: "conversations", action: "list", ...common };
  }

  if (sub === "post") {
    const channel = argv.channel ?? rest[0];
    const text = argv.text ?? rest[1] ?? rest.slice(2).join(" ");
    if (!channel || !text) {
      err("Usage: post --channel <id> --text <message> [--confirm]");
    }
    return { kind: "post", ...common, channel, text, confirm };
  }

  if (sub === "search") {
    const d = { ...argv, query: argv.query ?? rest[0] };
    try {
      const data = safeParseSearchMessagesParams(d);
      return { kind: "search", ...data, ...common };
    } catch (e) {
      err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  return { kind: "unknown", sub, cmd, ...common };
}

function showHelp(): void {
  out({
    usage: "slack-cli <command> [options]",
    commands: [
      "channels list                    - list channels",
      "conversations list                - list conversations (channels + DMs)",
      "search --query <string> [--count N] [--highlight] [--page N] [--cursor C] [--sort score|timestamp] [--sort_dir asc|desc] [--team_id T] - search messages (User Token)",
      "post --channel <id> --text <msg> [--confirm] - post message (use --confirm to execute)",
    ],
    "search options (see https://docs.slack.dev/reference/methods/search.messages/)":
      [
        "--query (required), --count (max 100), --highlight, --page, --cursor, --sort (score|timestamp), --sort_dir (asc|desc), --team_id",
      ],
    "search query syntax": [
      "mentions:USER_ID, from:<@USER_ID>, in:#channel, keyword. 例: search --query 'mentions:W01234' --count 50 --sort timestamp",
    ],
    env: "SLACK_BOT_TOKEN, SLACK_USER_TOKEN, or SLACK_TOKEN. search は User Token. SLACK_API_BASE_URL (optional)",
  });
}

/**
 * パース済みの情報だけを引数で受け、メイン処理を行う。argv は参照しない。
 * search は User Token 用の client、それ以外は Bot Token 用の client を使う。
 */
async function run(parsed: Parsed): Promise<void> {
  const { token, kind, baseUrl } = parsed;
  const opt = { token, baseUrl };
  const isUserScoped = parsed.kind === "search";
  const client = isUserScoped ? slackUserClient(opt) : slackBotClient(opt);

  switch (kind) {
    case "help":
      return showHelp();

    case "channels": {
      const res = await client.listChannels();
      return out(res.channels ?? []);
    }

    case "conversations": {
      const res = await client.listConversations();
      return out(res.channels ?? []);
    }

    case "post": {
      if (!parsed.confirm) {
        return out({
          _dryRun: true,
          _message: "Add --confirm to execute. Planned action:",
          action: "chat.postMessage",
          channel: parsed.channel,
          text: parsed.text,
        });
      }
      const res = await client.postMessage(parsed.channel, parsed.text);
      return out(res);
    }

    case "search": {
      const { token, baseUrl, ...rest } = parsed;
      const res = await slackUserClient({ token, baseUrl }).search(rest);
      return out(res);
    }

    default: {
      return err(
        `Unknown command: ${parsed.sub} ${parsed.cmd}. Use 'help' for usage.`,
      );
    }
  }
}

(async (): Promise<void> => {
  const args = parseArgs();
  await run(args);
})().catch((e) => err(e));
