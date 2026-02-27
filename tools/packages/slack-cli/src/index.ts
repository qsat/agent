import minimist from "minimist";
import { slackUserClient, slackBotClient, SlackClientOpt } from "./api.js";
import { helpText } from "./help-text.js";
import type { CliArgs } from "./schemas.js";
import {
  safeParseArgs,
  safeParseChatPostMessageParams,
  safeParseKind,
  safeParseSearchMessagesParams,
} from "./schemas.js";

/** メンション検索など User Token 向けコマンド用。SLACK_USER_TOKEN を優先。 */
function getTokenForUserScoped(): string | undefined {
  return process.env.SLACK_USER_TOKEN ?? "";
}

/** チャンネル一覧・投稿など Bot Token で十分なコマンド用。SLACK_BOT_TOKEN を優先。 */
function getTokenForBotScoped(): string | undefined {
  return process.env.SLACK_BOT_TOKEN ?? "";
}

/** コマンドに応じて使うトークンを返す。search.messages は User Token、それ以外は Bot Token 優先。 */
function getToken(sub: string | undefined): string | undefined {
  if (sub === "search.messages") return getTokenForUserScoped();
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

/** CLI の kind は Slack API メソッド名（search.messages, conversations.list, conversations.history, chat.postMessage）に一致させる。 */
type Parsed = ({ kind: "help" } | CliArgs) & SlackClientOpt;

/**
 * コマンドライン引数をパース・チェックする。不正な場合は err() で終了する。
 * 既知コマンドの引数は safeParseArgs（cliArgsSchema）で検証する。
 */
function parseArgs(): Parsed {
  const argv = minimist(process.argv.slice(2));
  const [sub, ...rest] = argv._ as string[];
  const token = getToken(sub);
  const baseUrl = getSlackApiBaseUrl();
  if (!token) {
    err(
      "Set SLACK_BOT_TOKEN and/or SLACK_USER_TOKEN (or SLACK_TOKEN). search.messages は User Token 必須.",
    );
  }

  const common = { token, baseUrl };

  if (!sub || sub === "help" || argv.help || argv.h) {
    return { kind: "help", ...common };
  }

  const raw: Record<string, unknown> = {
    ...argv,
    kind: safeParseKind(sub),
    query: argv.query ?? rest[0],
  };

  const data = safeParseArgs(raw);
  return { ...data, ...common };
}

function showHelp(): void {
  out(helpText);
}

/**
 * パース済みの情報だけを引数で受け、メイン処理を行う。argv は参照しない。
 * search.messages は User Token 用の client、それ以外は Bot Token 用の client を使う。
 */
async function run(parsed: Parsed): Promise<void> {
  const { token, baseUrl } = parsed;
  const opt = { token, baseUrl };

  switch (parsed.kind) {
    case "help":
      return showHelp();

    case "conversations.list": {
      const res = await slackBotClient(opt).listConversations(parsed);
      return out(res.channels ?? []);
    }

    case "conversations.history": {
      const res = await slackBotClient(opt).getChannelHistory(parsed);
      return out(res);
    }

    case "chat.postMessage": {
      const p = safeParseChatPostMessageParams(parsed);
      const res = await slackBotClient(opt).postMessage(p);
      return out(res);
    }

    case "search.messages": {
      const p = safeParseSearchMessagesParams(parsed);
      const res = await slackUserClient({ token, baseUrl }).search(p);
      return out(res);
    }

    default: {
      return err(`Unknown command.  Use 'help' for usage.`);
    }
  }
}

(async (): Promise<void> => {
  const args = parseArgs();
  await run(args);
})().catch((e) => err(e));
