import { describe, it, expect, vi, beforeEach } from "vitest";
import { slackClient } from "../api.js";

describe("slackClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("listChannels calls conversations.list with opt.token and expected URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        channels: [{ id: "C1", name: "general" }],
      }),
    });

    const client = slackClient({
      token: "xoxb-token",
      baseUrl: "https://slack.com/api",
    });
    const result = (await client.listChannels()) as Record<string, unknown>;
    expect(result.ok).toBe(true);
    expect((result.channels as unknown[])[0]).toEqual({
      id: "C1",
      name: "general",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://slack.com/api/conversations.list?limit=10&types=public_channel%2Cprivate_channel",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer xoxb-token",
          "Content-Type": "application/json; charset=utf-8",
        }),
      }),
    );
  });

  it("listConversations calls conversations.list without types filter", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, channels: [] }),
    });

    const client = slackClient({
      token: "xoxb-token",
      baseUrl: "https://slack.com/api",
    });
    await client.listConversations();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://slack.com/api/conversations.list?limit=10",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer xoxb-token",
        }),
      }),
    );
  });

  it("postMessage sends POST with channel and text", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        channel: "C123",
        ts: "1234567890.000000",
      }),
    });

    const client = slackClient({
      token: "xoxb-token",
      baseUrl: "https://slack.com/api",
    });
    const result = (await client.postMessage("C123", "hello")) as Record<
      string,
      unknown
    >;
    expect(result.ok).toBe(true);
    expect(result.channel).toBe("C123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://slack.com/api/chat.postMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ channel: "C123", text: "hello" }),
        headers: expect.objectContaining({
          Authorization: "Bearer xoxb-token",
        }),
      }),
    );
  });
});
