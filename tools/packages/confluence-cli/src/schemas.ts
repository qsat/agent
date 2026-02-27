import { z } from "zod";

/**
 * Confluence CLI 引数の Zod スキーマ定義（一元管理）。
 */

export const spacesListParamsSchema = z.object({});

export const pageGetParamsSchema = z.object({
  id: z.string().min(1),
});

export const searchParamsSchema = z.object({
  cql: z.string().min(1),
});

const KIND = ["spaces.list", "page.get", "search"] as const;
export const kindSchema = z.enum(KIND);

/** CLI 用: kind で判別する union。parseArgs で safeParseArgs に渡す raw に kind を含める。 */
export const cliArgsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("spaces.list") }),
  z.object({ kind: z.literal("page.get") }).merge(pageGetParamsSchema),
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
