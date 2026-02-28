import child_process from "child_process";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../../../../.env" });
dotenv.config({ path: path.resolve(__dirname, "./.env") });

const userId = process.env.LOCALRUN_USER_ID;
if (!userId) {
  console.error(
    "LOCALRUN_USER_ID を設定してください（メンション検索対象の Slack user ID）",
  );
  process.exit(1);
}

// search.messages でメンション検索（mentions:USER_ID）。--count を指定可能
const result = child_process.spawnSync(
  "bun",
  [
    "../index.ts",
    "--",
    "search.messages",
    "--query",
    `mentions:${userId}`,
    "--count",
    "20",
  ],
  { env: process.env, encoding: "utf-8" },
);
try {
  const data = JSON.parse(result.stdout?.trim() ?? "{}");
  const matches = data.messages?.matches ?? [];
  console.log("search.messages --query mentions:USER_ID --count 20:");
  console.log(JSON.stringify(data, null, 2));
  if (Array.isArray(matches)) {
    console.log("\n→ ヒット数:", matches.length);
  }
} catch {
  console.log(result.stdout ?? result.stderr ?? result);
}
