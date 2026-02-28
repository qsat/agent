import { z, ZodEnum, type ZodObject, type ZodUnion } from "zod";

/**
 * Slack API 引数の Zod スキーマ定義（一元管理）。
 */

export {
  searchMessagesResponseSchema,
  type SearchMessagesResponse,
  type SearchMessagesMatch,
  conversationsHistoryResponseSchema,
  type ConversationsHistoryResponse,
  type ConversationsHistoryMessage,
  conversationsListResponseSchema,
  type ConversationsListResponse,
  type ConversationListItem,
} from "./schema.response.js";

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

/** 独自機能「mentions-to-bot」用。botId は CLI では不要（run 内で auth.test から取得）。query は省略可。 */
const searchMessagesToBotParamsSchema = searchMessagesParamsSchema
  .omit({ query: true })
  .merge(
    z.object({
      botId: z.string().min(1).optional(),
      query: z
        .string()
        .transform((s) => s.trim())
        .optional(),
    }),
  );

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
export type SearchMessagesToBotParams = z.infer<
  typeof searchMessagesToBotParamsSchema
>;
export type ConversationsHistoryParams = z.infer<
  typeof conversationsHistoryParamsSchema
>;
export type ConversationsListParams = z.infer<
  typeof conversationsListParamsSchema
>;

/** Slack API メソッド名（SlackEndpoints と cliArgsSchema で使用）。 */
const KIND = [
  "chat.postMessage",
  "conversations.history",
  "conversations.list",
  "search.messages",
  "auth.test",
] as const;
type Kind = (typeof KIND)[number];
export type SlackEndpoints = `/${Kind}`;

/** CLI の第一引数で指定できるサブコマンド。Slack API メソッド + 独自機能（mentions-to-bot）。 */
export const CLI_SUBCOMMANDS = [
  KIND[0],
  KIND[1],
  KIND[2],
  KIND[3],
  "mentions-to-bot",
] as const;
export const subcommandSchema = z.enum(CLI_SUBCOMMANDS);

/** CLI 用: Slack API にそのまま対応するコマンドのみ。独自機能は Parsed で別扱い。 */
export const cliArgsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(KIND[0]) }).merge(chatPostMessageParamsSchema),
  z
    .object({ kind: z.literal(KIND[1]) })
    .merge(conversationsHistoryParamsSchema),
  z.object({ kind: z.literal(KIND[2]) }).merge(conversationsListParamsSchema),
  z.object({ kind: z.literal(KIND[3]) }).merge(searchMessagesParamsSchema),
  z
    .object({ kind: z.literal("mentions-to-bot") })
    .merge(searchMessagesToBotParamsSchema),
]);

export type CliArgs = z.infer<typeof cliArgsSchema>;
export const safeParse =
  <
    T extends Kind | "commandline" | "kind" | "mentions-to-bot",
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
export const safeParseSearchMessagesToBotParams = safeParse(
  "mentions-to-bot",
  searchMessagesToBotParamsSchema,
);

export const safeParseArgs = safeParse("commandline", cliArgsSchema);
