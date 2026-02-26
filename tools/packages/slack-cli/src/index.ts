import minimist from "minimist";
import { slackClient } from "./api.js";

function getToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN ?? process.env.SLACK_TOKEN;
}

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
  out({
    _dryRun: true,
    _message: "Add --confirm to execute. Planned action:",
    ...planned,
  });
  process.exit(0);
}

async function main() {
  const argv = minimist(process.argv.slice(2), { boolean: ["confirm"] });
  const [sub, cmd, ...rest] = argv._ as string[];

  if (!sub || sub === "help" || argv.help || argv.h) {
    out({
      usage: "slack-cli <command> [options]",
      commands: [
        "channels list                    - list channels",
        "conversations list                - list conversations (channels + DMs)",
        "post --channel <id> --text <msg> [--confirm] - post message (use --confirm to execute)",
      ],
      env: "SLACK_BOT_TOKEN or SLACK_TOKEN",
    });
    return;
  }

  const token = getToken();
  if (!token) {
    err("SLACK_BOT_TOKEN or SLACK_TOKEN is not set");
  }
  const client = slackClient({ token });

  if (sub === "channels" && cmd === "list") {
    const res = (await client.listChannels()) as Record<string, unknown>;
    if (!res.ok) {
      err(String(res.error ?? "channels.list failed"));
    }
    out(res.channels ?? []);
    return;
  }

  if (sub === "conversations" && cmd === "list") {
    const res = (await client.listConversations()) as Record<string, unknown>;
    if (!res.ok) {
      err(String(res.error ?? "conversations.list failed"));
    }
    out(res.channels ?? []);
    return;
  }

  if (sub === "post") {
    const channel = argv.channel ?? rest[0];
    const text = argv.text ?? rest[1] ?? argv._.slice(2).join(" ");
    if (!channel || !text) {
      err("Usage: post --channel <id> --text <message> [--confirm]");
    }
    const planned = { action: "chat.postMessage", channel, text };
    requireConfirm(argv, planned);
    const res = (await client.postMessage(channel, text)) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      err(String(res.error ?? "chat.postMessage failed"));
    }
    out(res);
    return;
  }

  err(`Unknown command: ${sub} ${cmd ?? ""}. Use 'help' for usage.`);
}

main().catch((e) => {
  err(String(e));
});
