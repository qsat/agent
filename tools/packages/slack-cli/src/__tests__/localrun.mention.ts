/**
 * メンション検索の動作確認用（mentions-to-bot / mentions-to-user 両方）。
 *
 * - mentions-to-bot: CLI 内で auth.test で Bot user_id 取得 → search.messages で検索。
 * - mentions-to-user: --user-id で指定した User へのメンションを検索。
 *
 * 必要: SLACK_USER_TOKEN, SLACK_BOT_TOKEN。
 * mentions-to-user 用: LOCALRUN_MENTION_USER_ID（省略時は to-user をスキップ）。
 *
 * 実行: npx tsx src/__tests__/localrun.mention.ts （package ルートで）
 */
import * as dotenv from "dotenv";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../../../.env") });
dotenv.config({ path: path.join(__dirname, "../../../../../.env") });

const pkgRoot = path.join(__dirname, "../..");

const botToken = process.env.SLACK_BOT_TOKEN ?? process.env.SLACK_TOKEN;
const userToken = process.env.SLACK_USER_TOKEN ?? process.env.SLACK_TOKEN;

if (!botToken) {
  console.error("SLACK_BOT_TOKEN を設定してください（mentions-to-bot 内で auth.test に使用）");
  process.exit(1);
}
if (!userToken) {
  console.error("SLACK_USER_TOKEN を設定してください（mentions-to-bot / mentions-to-user は User Token 必須）");
  process.exit(1);
}

type Match = {
  channel?: { id?: string; name?: string };
  user?: string;
  text?: string;
  ts?: string;
  permalink?: string;
};

type MentionResult = {
  total: number;
  matches: Match[];
};

function runMentionCmd(label: string, args: string[]): MentionResult {
  const result = spawnSync(
    "node",
    ["dist/index.js", ...args],
    { cwd: pkgRoot, env: process.env, encoding: "utf-8" },
  );

  if (result.error) {
    console.error(`${label} 実行エラー:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${label} stderr:`, result.stderr ?? "");
    console.error(`${label} stdout:`, result.stdout ?? "");
    process.exit(result.status ?? 1);
  }

  const data = JSON.parse(result.stdout?.trim() ?? "{}") as {
    ok?: boolean;
    messages?: { total?: number; matches?: Match[] };
  };
  const total = data.messages?.total ?? 0;
  const matches = data.messages?.matches ?? [];
  return { total, matches };
}

function printMatches(label: string, total: number, matches: Match[]): void {
  console.log(`\n=== ${label} ===`);
  console.log("API ヒット数:", total);
  console.log("本文にメンションを含む件数:", matches.length);
  if (matches.length === 0) {
    console.log("該当メッセージはありません。");
    return;
  }
  matches.forEach((m, i) => {
    const ch = m.channel?.name ?? m.channel?.id ?? "?";
    const ts = m.ts ?? "?";
    const text = (m.text ?? "").replace(/\n/g, " ");
    const permalink = m.permalink ?? "";
    console.log(`--- [${i + 1}] #${ch} (ts: ${ts}) ---`);
    console.log("user:", m.user ?? "?");
    console.log("text:", text.slice(0, 200) + (text.length > 200 ? "..." : ""));
    if (permalink) console.log("permalink:", permalink);
    console.log("");
  });
}

function main(): void {
  const count = process.env.LOCALRUN_MENTION_COUNT ?? "20";
  const baseArgs = ["--count", count, "--sort", "timestamp"];

  const { total: totalBot, matches: matchesBot } = runMentionCmd("mentions-to-bot", [
    "mentions-to-bot",
    ...baseArgs,
  ]);
  printMatches("mentions-to-bot", totalBot, matchesBot);

  const userId = process.env.LOCALRUN_MENTION_USER_ID;
  if (!userId) {
    console.log("\n--- mentions-to-user はスキップ（LOCALRUN_MENTION_USER_ID 未設定） ---");
    return;
  }

  const { total: totalUser, matches: matchesUser } = runMentionCmd("mentions-to-user", [
    "mentions-to-user",
    "--user-id",
    userId,
    ...baseArgs,
  ]);
  printMatches("mentions-to-user", totalUser, matchesUser);
}

main();
