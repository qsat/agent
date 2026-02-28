/**
 * accountId 取得 → 更新したページ・メンションされたページを検索する動作確認用。
 * 実行: npm run localrun （package ルートで）
 */
import * as dotenv from "dotenv";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../../../../.env") });

const pkgRoot = path.join(__dirname, "../..");

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("node", ["dist/index.js", ...args], {
    cwd: pkgRoot,
    env: process.env,
    encoding: "utf-8",
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout?.trim() ?? "",
    stderr: r.stderr?.trim() ?? "",
  };
}

// 1. accountId を取得
const userResult = runCli(["user", "current"]);
if (userResult.status !== 0) {
  console.error("user current 失敗:", userResult.stderr || userResult.stdout);
  process.exit(1);
}

let accountId: string;
try {
  const userData = JSON.parse(userResult.stdout || "{}") as { accountId?: string };
  accountId = userData.accountId ?? "";
  if (!accountId) {
    console.error("accountId が取得できませんでした:", userResult.stdout);
    process.exit(1);
  }
  console.log("accountId:", accountId);
  console.log("");
} catch (e) {
  console.error("user current のパースエラー:", e);
  process.exit(1);
}

// 2. ユーザーが更新したページ（contributor）、更新日時が新しい順
const contributorCql = `contributor="${accountId}" order by lastModified desc`;
const contributorResult = runCli(["search", "--cql", contributorCql]);
if (contributorResult.status !== 0) {
  console.error("search (contributor) 失敗:", contributorResult.stderr || contributorResult.stdout);
  process.exit(1);
}
try {
  const data = JSON.parse(contributorResult.stdout || "{}") as { results?: unknown[] };
  const results = data.results ?? [];
  console.log("--- 更新したページ (contributor=" + accountId + ") ---");
  console.log(JSON.stringify(data, null, 2));
  console.log("\n→ ヒット数:", Array.isArray(results) ? results.length : 0);
  console.log("");
} catch (e) {
  console.error("contributor 検索のパースエラー:", e);
}

// 3. メンションされたページ（mention）、更新日時が新しい順
const mentionCql = `mention="${accountId}" order by lastModified desc`;
const mentionResult = runCli(["search", "--cql", mentionCql]);
if (mentionResult.status !== 0) {
  console.error("search (mention) 失敗:", mentionResult.stderr || mentionResult.stdout);
  process.exit(1);
}
try {
  const data = JSON.parse(mentionResult.stdout || "{}") as { results?: unknown[] };
  const results = data.results ?? [];
  console.log("--- メンションされたページ (mention=" + accountId + ") ---");
  console.log(JSON.stringify(data, null, 2));
  console.log("\n→ ヒット数:", Array.isArray(results) ? results.length : 0);
} catch (e) {
  console.error("mention 検索のパースエラー:", e);
  process.exit(1);
}
