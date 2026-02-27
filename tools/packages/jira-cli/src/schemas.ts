import { z } from "zod";

/**
 * Jira CLI 引数の Zod スキーマ定義（一元管理）。
 */

export const projectsListParamsSchema = z.object({});

export const issueGetParamsSchema = z.object({
  key: z.string().min(1),
});

export const searchParamsSchema = z.object({
  jql: z.string().min(1),
  maxResults: z.number().int().positive().default(10),
});

const KIND = ["projects.list", "issue.get", "search"] as const;
export const kindSchema = z.enum(KIND);

/** CLI 用: kind で判別する union。parseArgs で safeParseArgs に渡す raw に kind を含める。 */
export const cliArgsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("projects.list") }),
  z.object({ kind: z.literal("issue.get") }).merge(issueGetParamsSchema),
  z.object({ kind: z.literal("search") }).merge(searchParamsSchema),
]);

export type CliArgs = z.infer<typeof cliArgsSchema>;

export const safeParse =
  <T extends string, S extends z.ZodType>(n: T, s: S) =>
  (raw: Record<string, unknown> | string) => {
    const ret = s.safeParse(raw);
    if (!ret.success) {
      throw new Error(`${n}: ${JSON.stringify(ret.error, null, 2)}`);
    }
    return ret.data as z.infer<S>;
  };

export const safeParseKind = safeParse("kind", kindSchema);
export const safeParseArgs = safeParse("commandline", cliArgsSchema);
