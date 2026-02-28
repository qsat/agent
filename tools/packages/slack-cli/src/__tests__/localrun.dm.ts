/**
 * DM チャンネルの履歴取得の動作確認用。
 *
 * 使い方:
 * - SLACK_DM_CHANNEL_ID を設定すると、その channel（D で始まる ID）の履歴を取得する。
 * - 未設定の場合は SLACK_DM_USER_EMAIL（必須）で
 *   users.lookupByEmail → conversations.open により DM channel を解決してから履歴を取得する。
 *   ※ Bot がその DM に参加している必要あり。users:read.email / im:read 等のスコープが必要な場合あり。
 *
 * 実行: npm run localrun:dm （package ルートで）
 */
import * as dotenv from "dotenv";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../../../../.env") });
dotenv.config({ path: path.join(__dirname, "./.env") });

const pkgRoot = path.join(__dirname, "../..");
const baseUrl = process.env.SLACK_API_BASE_URL ?? "https://slack.com/api";
const token =
  process.env.SLACK_BOT_TOKEN ??
  process.env.SLACK_USER_TOKEN ??
  process.env.SLACK_TOKEN;

if (!token) {
  console.error("SLACK_BOT_TOKEN または SLACK_USER_TOKEN を設定してください");
  process.exit(1);
}

const authHeader = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json; charset=utf-8",
};

async function lookupUserByEmail(email: string): Promise<string> {
  const url = `${baseUrl}/users.lookupByEmail?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: authHeader });
  const data = (await res.json()) as {
    ok?: boolean;
    user?: { id: string };
    error?: string;
  };
  if (!data.ok || !data.user?.id) {
    throw new Error(data.error ?? "users.lookupByEmail failed");
  }
  return data.user.id;
}

async function openDmChannel(userId: string): Promise<string> {
  const res = await fetch(`${baseUrl}/conversations.open`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({ users: userId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    channel?: { id: string };
    error?: string;
  };
  if (!data.ok || !data.channel?.id) {
    throw new Error(data.error ?? "conversations.open failed");
  }
  return data.channel.id;
}

async function main(): Promise<void> {
  let channelId = process.env.SLACK_DM_CHANNEL_ID;

  if (!channelId) {
    const email = process.env.SLACK_DM_USER_EMAIL;
    if (!email) {
      console.error(
        "SLACK_DM_CHANNEL_ID 未設定時は SLACK_DM_USER_EMAIL が必須です。",
      );
      process.exit(1);
    }
    console.log("DM channel を解決中（email は表示しません）");
    try {
      const userId = await lookupUserByEmail(email);
      console.log("user id:", userId);
      channelId = await openDmChannel(userId);
      console.log("DM channel id:", channelId);
    } catch (e) {
      console.error(e);
      console.error(
        "→ SLACK_DM_CHANNEL_ID に DM の channel ID（D で始まる）を設定すると lookup をスキップできます。",
      );
      process.exit(1);
    }
  }

  const limit = process.env.LOCALRUN_DM_LIMIT ?? "10";
  console.log("DM 履歴取得: channel=", channelId, "limit=", limit);
  console.log("");

  const result = spawnSync(
    "node",
    [
      "dist/index.js",
      "conversations.history",
      "--channel",
      channelId,
      "--limit",
      limit,
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

  try {
    const data = JSON.parse(result.stdout?.trim() ?? "{}");
    const messages = (data.messages ?? []) as Array<{
      ts?: string;
      text?: string;
      user?: string;
    }>;
    console.log("conversations.history 結果: messages 数 =", messages.length);
    console.log(JSON.stringify(data, null, 2));
    if (messages.length > 0) {
      console.log("\n--- 直近メッセージ ---");
      messages.slice(0, 5).forEach((m, i) => {
        console.log(
          `[${i + 1}] ts=${m.ts} user=${m.user} text=${(m.text ?? "").slice(0, 80)}`,
        );
      });
    }
  } catch {
    console.log(result.stdout ?? "");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
