import minimist from "minimist";
import { slackClient } from "./api.js";

function getToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN ?? process.env.SLACK_TOKEN;
}

const SLACK_API_DEFAULT_BASE_URL = "https://slack.com/api";

function getSlackApiBaseUrl(): string {
  return process.env.SLACK_API_BASE_URL ?? SLACK_API_DEFAULT_BASE_URL;
}

function out(obj: unknown) {
  console.log(JSON.stringify(obj));
}

function err(msg: string | Error): never {
  console.error(msg);
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
  | { kind: "mentions" }
  | { kind: "reactions" }
  | {
      kind: "post";
      channel: string;
      text: string;
      confirm: boolean;
    }
  | { kind: "unknown"; sub: string; cmd: string }
) & {
  token: string;
  baseUrl: string;
};

/**
 * コマンドライン引数をパース・チェックする。不正な場合は err() で終了する。
 */
function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2), { boolean: ["confirm"] });
  const [sub, cmd, ...rest] = argv._ as string[];
  const confirm = Boolean(argv.confirm);
  const token = getToken();
  const baseUrl = getSlackApiBaseUrl();
  if (!token) {
    err("SLACK_BOT_TOKEN or SLACK_TOKEN must be set");
  }

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help", token, baseUrl };
  }

  if (sub === "channels" && cmd === "list") {
    return { kind: "channels", action: "list", token, baseUrl };
  }

  if (sub === "conversations" && cmd === "list") {
    return { kind: "conversations", action: "list", token, baseUrl };
  }

  if (sub === "mentions") {
    return { kind: "mentions", token, baseUrl };
  }

  if (sub === "reactions") {
    return { kind: "reactions", token, baseUrl };
  }

  if (sub === "post") {
    const channel = argv.channel ?? rest[0];
    const text = argv.text ?? rest[1] ?? rest.slice(2).join(" ");
    if (!channel || !text) {
      err("Usage: post --channel <id> --text <message> [--confirm]");
    }
    return { kind: "post", token, baseUrl, channel, text, confirm };
  }

  return { kind: "unknown", sub, cmd, token, baseUrl };
}

function showHelp(): void {
  out({
    usage: "slack-cli <command> [options]",
    commands: [
      "channels list                    - list channels",
      "conversations list                - list conversations (channels + DMs)",
      "mentions                         - list messages that mention you",
      "reactions                        - list reactions on your messages",
      "post --channel <id> --text <msg> [--confirm] - post message (use --confirm to execute)",
    ],
    env: "SLACK_BOT_TOKEN or SLACK_TOKEN (required), SLACK_API_BASE_URL (optional, default: https://slack.com/api)",
  });
}

/**
 * パース済みの情報だけを引数で受け、メイン処理を行う。argv は参照しない。
 */
async function run(parsed: Parsed): Promise<void> {
  const client = slackClient({ token: parsed.token, baseUrl: parsed.baseUrl });

  switch (parsed.kind) {
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

    case "mentions": {
      const res = await client.getMentionsToMe();
      return out(res);
    }

    case "reactions": {
      const res = await client.getReactionsToMyMessages();
      return out(res);
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

    default: {
      return err(
        `Unknown command: ${parsed.sub} ${parsed.cmd}. Use 'help' for usage.`,
      );
    }
  }
}

(async (): Promise<void> => await run(parseArgs()))().catch((e) => {
  err(e);
});
