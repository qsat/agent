/**
 * Bot へのメンションを検索して表示する動作確認用。
 *
 * mentions-to-bot を実行（CLI 内で auth.test で Bot user_id 取得 → search.messages で検索し本文メンションのみ返す）。
 * SLACK_USER_TOKEN と SLACK_BOT_TOKEN の両方が必要。
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
  console.error("SLACK_USER_TOKEN を設定してください（mentions-to-bot は User Token 必須）");
  process.exit(1);
}

type Match = {
  channel?: { id?: string; name?: string };
  user?: string;
  text?: string;
  ts?: string;
  permalink?: string;
};

function main(): void {
  const count = process.env.LOCALRUN_MENTION_COUNT ?? "20";
  const result = spawnSync(
    "node",
    [
      "dist/index.js",
      "mentions-to-bot",
      "--count",
      count,
      "--sort",
      "timestamp",
    ],
    { cwd: pkgRoot, env: process.env, encoding: "utf-8" },
  );

  if (result.error) {
    console.error("実行エラー:", result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("stderr:", result.stderr ?? "");
    console.error("stdout:", result.stdout ?? "");
    process.exit(result.status ?? 1);
  }

  const data = JSON.parse(result.stdout?.trim() ?? "{}") as {
    ok?: boolean;
    messages?: { total?: number; matches?: Match[] };
  };
  const total = data.messages?.total ?? 0;
  const matches = data.messages?.matches ?? [];

  console.log("API ヒット数:", total);
  console.log("本文にメンションを含む件数:", matches.length);
  console.log("");

  if (matches.length === 0) {
    console.log("本文に Bot メンションを含むメッセージはありません。");
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

main();
