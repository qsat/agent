import { z } from "zod";

/**
 * Slack API 引数の Zod スキーマ定義（一元管理）。
 */

/** @see https://docs.slack.dev/reference/methods/search.messages/ */
export const searchMessagesParamsSchema = z.object({
  /** 検索クエリ（必須） */
  query: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  /** 1ページあたりの件数。最大 100。default: 20 */
  count: z.coerce.number().int().min(1).max(100).default(20),
  /** true でクエリにマッチした部分をハイライト用マーカー付きで返す。CLI の --highlight フラグや文字列 "true"/"false" を boolean に変換 */
  highlight: z.coerce.boolean().default(false),
  /** ページ番号。default: 1（cursor と併用時は cursor 優先） */
  page: z.coerce.number().int().min(1).optional(),
  /** カーソルページネーション。初回は `*`、次回以降は前回の next_cursor */
  cursor: z.string().optional(),
  /** 並び順: "score" | "timestamp"。default: "score" */
  sort: z.enum(["score", "timestamp"]).default("timestamp"),
  /** 並び方向: "asc" | "desc"。default: "desc" */
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
  /** 検索対象のチームID。Enterprise Grid の org token 時は必須 */
  team_id: z.string().optional(),
});

export type SearchMessagesParams = z.infer<typeof searchMessagesParamsSchema>;

/** CLI の search は query 必須。他は未指定時は API デフォルトに任せるため optional のまま渡す */
export function parseSearchMessagesParams(
  raw: Record<string, unknown>,
): SearchMessagesParams {
  return searchMessagesParamsSchema.parse(raw);
}

export function safeParseSearchMessagesParams(raw: Record<string, unknown>) {
  const ret = searchMessagesParamsSchema.safeParse(raw);
  if (!ret.success) {
    throw new Error(`search: ${JSON.stringify(ret, null, 2)}`);
  }
  return ret.data satisfies SearchMessagesParams;
}

/** @see https://api.slack.com/methods/conversations.history */
export const conversationsHistoryParamsSchema = z.object({
  channel: z.string().min(1),
  oldest: z.string(),
  latest: z.string(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  cursor: z.string().optional(),
});
export type ConversationsHistoryParams = z.infer<
  typeof conversationsHistoryParamsSchema
>;

export function safeParseConversationsHistoryParams(
  raw: Record<string, unknown>,
) {
  const ret = conversationsHistoryParamsSchema.safeParse(raw);
  if (!ret.success) {
    throw new Error(
      `conversations.history: ${JSON.stringify(ret.error, null, 2)}`,
    );
  }
  return ret.data satisfies ConversationsHistoryParams;
}

/** @see https://api.slack.com/methods/conversations.list */
export const conversationsListParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  types: z.string().optional(),
});
export type ConversationsListParams = z.infer<
  typeof conversationsListParamsSchema
>;

export function safeParseConversationsListParams(
  raw: Record<string, unknown>,
) {
  const ret = conversationsListParamsSchema.safeParse(raw);
  if (!ret.success) {
    throw new Error(
      `conversations.list: ${JSON.stringify(ret.error, null, 2)}`,
    );
  }
  return ret.data satisfies ConversationsListParams;
}

/** @see https://api.slack.com/methods/chat.postMessage */
export const chatPostMessageParamsSchema = z.object({
  channel: z.string().min(1),
  text: z.string(),
});
export type ChatPostMessageParams = z.infer<typeof chatPostMessageParamsSchema>;

export function safeParseChatPostMessageParams(raw: Record<string, unknown>) {
  const ret = chatPostMessageParamsSchema.safeParse(raw);
  if (!ret.success) {
    throw new Error(
      `chat.postMessage: ${JSON.stringify(ret.error, null, 2)}`,
    );
  }
  return ret.data satisfies ChatPostMessageParams;
}
