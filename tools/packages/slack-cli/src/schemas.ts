import { z, ZodEnum, type ZodObject, type ZodUnion } from "zod";

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

/**
 * conversations.history API パラメータ。
 * @see https://api.slack.com/methods/conversations.history
 */
export const conversationsHistoryParamsSchema = z.object({
  /** Conversation ID to fetch history for（必須） */
  channel: z.string().min(1),
  /**
   * Only messages after this Unix timestamp will be included in results.
   * Default: "0"
   */
  oldest: z.string().optional(),
  /**
   * Only messages before this Unix timestamp will be included in results.
   * Default is the current time.
   */
  latest: z.string().optional(),
  /**
   * The maximum number of items to return. Fewer than the requested number may be returned.
   * Maximum of 999. Default: 100.
   */
  limit: z.coerce.number().int().min(1).max(999).optional(),
  /**
   * Paginate through collections by setting cursor to response_metadata.next_cursor from a previous request.
   * Default value fetches the first "page".
   */
  cursor: z.string().optional(),
  /**
   * Include messages with oldest or latest timestamps in results.
   * Ignored unless either timestamp is specified. Default: false.
   */
  inclusive: z.coerce.boolean().optional(),
  /**
   * Return all metadata associated with this message.
   * Default: false.
   */
  include_all_metadata: z.coerce.boolean().optional(),
});

/** @see https://api.slack.com/methods/conversations.list */
export const conversationsListParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  types: z.string().optional(),
});

/** @see https://api.slack.com/methods/chat.postMessage */
export const chatPostMessageParamsSchema = z.object({
  channel: z.string().min(1),
  text: z.string(),
});

/** User Token（xoxp-）の検証。Slack User OAuth token 用。 */
export const userTokenSchema = z
  .string()
  .min(1)
  .regex(/^xoxp-/, "xoxp- で始まるトークンを指定してください");

/** Bot Token（xoxb-）の検証。Slack Bot OAuth token 用。 */
export const botTokenSchema = z
  .string()
  .min(1)
  .regex(/^xoxb-/, "xoxb- で始まるトークンを指定してください");

export type ChatPostMessageParams = z.infer<typeof chatPostMessageParamsSchema>;
export type SearchMessagesParams = z.infer<typeof searchMessagesParamsSchema>;
export type ConversationsHistoryParams = z.infer<
  typeof conversationsHistoryParamsSchema
>;
export type ConversationsListParams = z.infer<
  typeof conversationsListParamsSchema
>;

const KIND = [
  "chat.postMessage",
  "conversations.history",
  "conversations.list",
  "search.messages",
  "auth.test",
] as const;
export const kindSchema = z.enum(KIND);
/** CLI 用: kind で判別する union。parseArgs で safeParseArgs に渡す raw に kind を含める。 */
export const cliArgsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(KIND[0]) }).merge(chatPostMessageParamsSchema),
  z
    .object({ kind: z.literal(KIND[1]) })
    .merge(conversationsHistoryParamsSchema),
  z.object({ kind: z.literal(KIND[2]) }).merge(conversationsListParamsSchema),
  z.object({ kind: z.literal(KIND[3]) }).merge(searchMessagesParamsSchema),
]);

type Kind = (typeof KIND)[number];
export type SlackEndpoints = `/${Kind}`;

export type CliArgs = z.infer<typeof cliArgsSchema>;
export const safeParse =
  <
    T extends Kind | "commandline" | "kind",
    S extends ZodObject | ZodUnion | ZodEnum,
    U = z.infer<S>,
  >(
    n: T,
    s: S,
  ) =>
  (raw: Record<string, unknown> | string) => {
    const ret = s.safeParse(raw);
    if (!ret.success) {
      throw new Error(`${n}: ${JSON.stringify(ret.error, null, 2)}`);
    }
    return ret.data as U;
  };
export const safeParseKind = safeParse("kind", kindSchema);

export const safeParseChatPostMessageParams = safeParse(
  "chat.postMessage",
  chatPostMessageParamsSchema,
);
export const safeParseConversationsListParams = safeParse(
  "conversations.list",
  conversationsListParamsSchema,
);
export const safeParseConversationsHistoryParams = safeParse(
  "conversations.history",
  conversationsHistoryParamsSchema,
);
export const safeParseSearchMessagesParams = safeParse(
  "search.messages",
  searchMessagesParamsSchema,
);

export const safeParseArgs = safeParse("commandline", cliArgsSchema);
