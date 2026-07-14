import "server-only";

const X_API_BASE = "https://api.twitter.com/2";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface XTweetMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
}

export interface XTweetEntity {
  start: number;
  end: number;
}

export interface XTweetUrl extends XTweetEntity {
  url: string;
  expanded_url: string;
  display_url: string;
}

export interface XTweetHashtag extends XTweetEntity {
  tag: string;
}

export interface XTweetMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  lang?: string;
  public_metrics?: XTweetMetrics;
  entities?: {
    urls?: XTweetUrl[];
    hashtags?: XTweetHashtag[];
    mentions?: { username: string }[];
  };
  attachments?: { media_keys?: string[] };
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  verified?: boolean;
  verified_type?: string;
}

export interface XSearchResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
    media?: XTweetMedia[];
  };
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count: number;
    next_token?: string;
  };
  errors?: { message: string }[];
}

export interface NormalizedTweet {
  tweet_id: string;
  author_id: string;
  username: string;
  display_name: string;
  text: string;
  url: string;
  language: string | null;
  hashtags: string[];
  metrics: Record<string, number>;
  media: XTweetMedia[];
  urls: string[];
  is_verified: boolean;
  raw_json: Record<string, unknown>;
  tweet_created_at: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class XApiClient {
  private bearerToken: string;
  private lastRequestAt = 0;
  private minIntervalMs = 1000;

  constructor(bearerToken?: string) {
    const token = bearerToken ?? process.env.X_API_BEARER_TOKEN;
    if (!token) {
      throw new Error("X_API_BEARER_TOKEN is not configured");
    }
    this.bearerToken = token;
  }

  private async rateLimit() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${X_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await this.rateLimit();

      try {
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") ?? "60",
            10
          );
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`X API error ${response.status}: ${body}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error("X API request failed");
  }

  async searchRecentTweets(
    query: string,
    options: { maxResults?: number; nextToken?: string; sinceId?: string } = {}
  ): Promise<{ tweets: NormalizedTweet[]; nextToken?: string; newestId?: string }> {
    const params: Record<string, string> = {
      query,
      max_results: String(options.maxResults ?? 100),
      "tweet.fields":
        "created_at,public_metrics,lang,entities,attachments,author_id",
      "user.fields": "username,name,verified,verified_type",
      expansions: "author_id,attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
    };

    if (options.nextToken) params.next_token = options.nextToken;
    if (options.sinceId) params.since_id = options.sinceId;

    const response = await this.request<XSearchResponse>(
      "/tweets/search/recent",
      params
    );

    const users = new Map(
      (response.includes?.users ?? []).map((u) => [u.id, u])
    );
    const mediaMap = new Map(
      (response.includes?.media ?? []).map((m) => [m.media_key, m])
    );

    const tweets: NormalizedTweet[] = (response.data ?? []).map((tweet) => {
      const user = users.get(tweet.author_id);
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const media = mediaKeys
        .map((key) => mediaMap.get(key))
        .filter(Boolean) as XTweetMedia[];

      return {
        tweet_id: tweet.id,
        author_id: tweet.author_id,
        username: user?.username ?? "unknown",
        display_name: user?.name ?? "Unknown",
        text: tweet.text,
        url: `https://x.com/${user?.username ?? "i"}/status/${tweet.id}`,
        language: tweet.lang ?? null,
        hashtags: (tweet.entities?.hashtags ?? []).map((h) => h.tag),
        metrics: (tweet.public_metrics ?? {}) as Record<string, number>,
        media,
        urls: (tweet.entities?.urls ?? []).map((u) => u.expanded_url),
        is_verified: user?.verified ?? false,
        raw_json: tweet as unknown as Record<string, unknown>,
        tweet_created_at: tweet.created_at,
      };
    });

    return {
      tweets,
      nextToken: response.meta?.next_token,
      newestId: response.meta?.newest_id,
    };
  }

  async fetchAllPages(
    query: string,
    options: { sinceId?: string; maxPages?: number } = {}
  ): Promise<NormalizedTweet[]> {
    const all: NormalizedTweet[] = [];
    let nextToken: string | undefined;
    const maxPages = options.maxPages ?? 3;

    for (let page = 0; page < maxPages; page++) {
      const result = await this.searchRecentTweets(query, {
        nextToken,
        sinceId: page === 0 ? options.sinceId : undefined,
      });

      all.push(...result.tweets);

      if (!result.nextToken || result.tweets.length === 0) break;
      nextToken = result.nextToken;
    }

    return all;
  }
}

export function getXApiClient(): XApiClient {
  return new XApiClient();
}
