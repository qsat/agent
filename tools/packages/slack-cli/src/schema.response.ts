import { z } from "zod";

/**
 * Slack API レスポンスの Zod スキーマ定義。
 */

/**
 * search.messages レスポンスの Zod スキーマ。
 * @see https://docs.slack.dev/reference/methods/search.messages/
 */
const searchMessagesMatchChannelSchema = z.object({
  id: z.string(),
  is_ext_shared: z.boolean().optional(),
  is_mpim: z.boolean().optional(),
  is_org_shared: z.boolean().optional(),
  is_pending_ext_shared: z.boolean().optional(),
  is_private: z.boolean().optional(),
  is_shared: z.boolean().optional(),
  name: z.string(),
  pending_shared: z.array(z.unknown()).optional(),
});

const searchMessagesMatchSchema = z.object({
  channel: searchMessagesMatchChannelSchema,
  iid: z.string().optional(),
  permalink: z.string().optional(),
  team: z.string().optional(),
  text: z.string().optional(),
  ts: z.string().optional(),
  type: z.string().optional(),
  user: z.string().nullable().optional(),
  username: z.string().optional(),
});

const searchMessagesPaginationSchema = z.object({
  first: z.number(),
  last: z.number(),
  page: z.number(),
  page_count: z.number(),
  per_page: z.number(),
  total_count: z.number(),
});

const searchMessagesPagingSchema = z.object({
  count: z.number(),
  page: z.number(),
  pages: z.number(),
  total: z.number(),
});

export const searchMessagesResponseSchema = z.object({
  ok: z.literal(true),
  query: z.string().optional(),
  messages: z.object({
    matches: z.array(searchMessagesMatchSchema),
    pagination: searchMessagesPaginationSchema.optional(),
    paging: searchMessagesPagingSchema.optional(),
    total: z.number().optional(),
  }),
});

export type SearchMessagesResponse = z.infer<typeof searchMessagesResponseSchema>;
export type SearchMessagesMatch = z.infer<typeof searchMessagesMatchSchema>;

// --- conversations.history ---
/**
 * conversations.history レスポンスの Zod スキーマ。
 * @see https://api.slack.com/methods/conversations.history
 */
const conversationsHistoryMessageSchema = z.object({
  type: z.string(),
  user: z.string().optional(),
  text: z.string().optional(),
  ts: z.string(),
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
  reactions: z.array(z.unknown()).optional(),
  is_starred: z.boolean().optional(),
  is_limited: z.boolean().optional(),
}).passthrough();

export const conversationsHistoryResponseSchema = z.object({
  ok: z.literal(true),
  messages: z.array(conversationsHistoryMessageSchema),
  has_more: z.boolean().optional(),
  pin_count: z.number().optional(),
  latest: z.string().optional(),
  response_metadata: z.object({
    next_cursor: z.string().optional(),
  }).optional(),
});

export type ConversationsHistoryResponse = z.infer<
  typeof conversationsHistoryResponseSchema
>;
export type ConversationsHistoryMessage = z.infer<
  typeof conversationsHistoryMessageSchema
>;

// --- conversations.list ---
/**
 * conversations.list レスポンスの Zod スキーマ。
 * @see https://api.slack.com/methods/conversations.list
 */
const conversationTopicOrPurposeSchema = z.object({
  value: z.string(),
  creator: z.string().optional(),
  last_set: z.number().optional(),
});

const conversationListItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  is_channel: z.boolean().optional(),
  is_group: z.boolean().optional(),
  is_im: z.boolean().optional(),
  is_mpim: z.boolean().optional(),
  created: z.number().optional(),
  creator: z.string().optional(),
  is_archived: z.boolean().optional(),
  is_general: z.boolean().optional(),
  is_shared: z.boolean().optional(),
  is_ext_shared: z.boolean().optional(),
  is_org_shared: z.boolean().optional(),
  is_member: z.boolean().optional(),
  is_private: z.boolean().optional(),
  is_open: z.boolean().optional(),
  user: z.string().optional(),
  name_normalized: z.string().optional(),
  unlinked: z.number().optional(),
  pending_shared: z.array(z.unknown()).optional(),
  topic: conversationTopicOrPurposeSchema.optional(),
  purpose: conversationTopicOrPurposeSchema.optional(),
  previous_names: z.array(z.string()).optional(),
  num_members: z.number().optional(),
  updated: z.number().optional(),
  priority: z.number().optional(),
  is_user_deleted: z.boolean().optional(),
}).passthrough();

export const conversationsListResponseSchema = z.object({
  ok: z.literal(true),
  channels: z.array(conversationListItemSchema),
  response_metadata: z.object({
    next_cursor: z.string().optional(),
  }).optional(),
});

export type ConversationsListResponse = z.infer<
  typeof conversationsListResponseSchema
>;
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
