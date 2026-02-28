/**
 * DM にチャット投稿する動作確認用。
 *
 * 使い方:
 * - SLACK_DM_CHANNEL_ID を設定すると、lookup をスキップしてその channel に投稿する（推奨）。
 *   DM の channel ID（D で始まる）は、Slack でその DM を開いたときの URL や API で確認できる。
 * - 未設定の場合は SLACK_DM_USER_EMAIL（必須）で
 *   users.lookupByEmail → conversations.open により DM channel を解決する。
 *   ※ users:read.email / im:write などのスコープが必要。missing_scope のときは SLACK_DM_CHANNEL_ID を設定してください。
 *
 * 実行: npm run localrun:chat （package ルートで）
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
// users.lookupByEmail / conversations.open 用（Bot に scope を足した場合は Bot を優先）
const tokenForResolve =
  process.env.SLACK_BOT_TOKEN ??
  process.env.SLACK_USER_TOKEN ??
  process.env.SLACK_TOKEN;
const tokenForPost =
  process.env.SLACK_BOT_TOKEN ??
  process.env.SLACK_USER_TOKEN ??
  process.env.SLACK_TOKEN;

if (!tokenForResolve || !tokenForPost) {
  console.error(
    "SLACK_BOT_TOKEN および SLACK_USER_TOKEN（DM 解決用）を設定してください",
  );
  process.exit(1);
}

const authHeaderForResolve = {
  Authorization: `Bearer ${tokenForResolve}`,
  "Content-Type": "application/json; charset=utf-8",
};

/** users.lookupByEmail で user ID を取得（users:read.email が必要） */
async function lookupUserByEmail(email: string): Promise<string> {
  const url = `${baseUrl}/users.lookupByEmail?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: authHeaderForResolve });
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

/** conversations.open で DM channel ID を取得（im:write 等が必要） */
async function openDmChannel(userId: string): Promise<string> {
  const res = await fetch(`${baseUrl}/conversations.open`, {
    method: "POST",
    headers: authHeaderForResolve,
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
    console.log(
      "DM channel を解決中（users:read.email 等のスコープが必要。missing_scope の場合は SLACK_DM_CHANNEL_ID を設定）",
    );
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

  const text = process.env.LOCALRUN_CHAT_TEXT ?? "Test from localrun.chat";
  console.log("投稿:", { channel: channelId, text });
  console.log("");

  // 投稿は Bot Token で実行（SLACK_BOT_TOKEN を子プロセスで使うため env をそのまま渡す）
  const result = spawnSync(
    "node",
    [
      "dist/index.js",
      "chat.postMessage",
      "--channel",
      channelId,
      "--text",
      text,
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
    console.log("chat.postMessage 結果:");
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(result.stdout ?? "");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
