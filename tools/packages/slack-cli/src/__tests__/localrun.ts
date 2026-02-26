import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../../../../.env" });

import child_process from "child_process";

const result = child_process.spawnSync(
  "bun",
  ["../index.ts", "--", "channels", "list"],
  {
    env: process.env,
    encoding: "utf-8",
  },
);

console.log(JSON.stringify(JSON.parse(result.stdout), null, 2));
