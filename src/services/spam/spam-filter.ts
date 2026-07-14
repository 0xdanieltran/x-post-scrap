import type { NormalizedTweet } from "@/services/x-api/client";
import type { ParsedJob } from "@/services/parser/job-parser";
import {
  HIRING_SIGNALS,
  SPAM_PATTERNS,
  URL_SHORTENERS,
} from "@/lib/constants/job-dictionaries";

export interface SpamFilterConfig {
  blockedKeywords: string[];
  blockedDomains: string[];
  minQualityScore?: number;
}

export interface SpamCheckResult {
  isRejected: boolean;
  qualityScore: number;
  rejectionReason: string | null;
}

function hasHiringSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return HIRING_SIGNALS.some((signal) => lower.includes(signal.toLowerCase()));
}

function checkBlockedKeywords(
  text: string,
  keywords: string[]
): string | null {
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return `Blocked keyword: ${keyword}`;
    }
  }
  return null;
}

function checkBlockedDomains(urls: string[], domains: string[]): string | null {
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      for (const domain of domains) {
        if (domain === "t.co") continue;
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return `Blocked domain: ${domain}`;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function checkSpamPatterns(text: string): string | null {
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return `Spam pattern detected: ${pattern.source}`;
    }
  }
  return null;
}

function checkUrlShorteners(urls: string[]): string | null {
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      if (URL_SHORTENERS.includes(hostname)) {
        return `URL shortener detected: ${hostname}`;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function checkTelegramOnly(text: string, urls: string[]): string | null {
  const lower = text.toLowerCase();
  const telegramOnly =
    (lower.includes("telegram") || lower.includes("t.me")) &&
    !urls.some((u) => !u.includes("t.me") && !u.includes("telegram"));

  if (
    telegramOnly &&
    (lower.includes("only") || lower.includes("dm") || urls.every((u) => u.includes("t.me")))
  ) {
    return "Telegram-only contact";
  }
  return null;
}

function calculateQualityScore(
  tweet: NormalizedTweet,
  parsed: ParsedJob
): number {
  let score = 50;

  if (tweet.is_verified) score += 10;
  if (parsed.title) score += 10;
  if (parsed.company) score += 8;
  if (parsed.application_url || parsed.application_email) score += 10;
  if (parsed.technologies.length > 0) score += Math.min(parsed.technologies.length * 3, 12);
  if (parsed.salary_min || parsed.salary_max) score += 5;
  if (parsed.location || parsed.remote) score += 3;
  if (hasHiringSignal(tweet.text)) score += 5;

  const likes = tweet.metrics.like_count ?? 0;
  if (likes > 10) score += 2;
  if (likes > 50) score += 3;

  if (!parsed.title && !parsed.company) score -= 15;
  if (parsed.technologies.length === 0) score -= 5;
  if (!hasHiringSignal(tweet.text)) score -= 20;

  return Math.max(0, Math.min(100, score));
}

export function checkSpam(
  tweet: NormalizedTweet,
  parsed: ParsedJob,
  config: SpamFilterConfig
): SpamCheckResult {
  const checks: (() => string | null)[] = [
    () =>
      !hasHiringSignal(tweet.text)
        ? "No hiring signal detected"
        : null,
    () => checkSpamPatterns(tweet.text),
    () => checkBlockedKeywords(tweet.text, config.blockedKeywords),
    () => checkBlockedDomains(tweet.urls, config.blockedDomains),
    () => checkUrlShorteners(tweet.urls),
    () => checkTelegramOnly(tweet.text, tweet.urls),
  ];

  for (const check of checks) {
    const reason = check();
    if (reason) {
      return {
        isRejected: true,
        qualityScore: 0,
        rejectionReason: reason,
      };
    }
  }

  const qualityScore = calculateQualityScore(tweet, parsed);
  const minScore = config.minQualityScore ?? 30;

  if (qualityScore < minScore) {
    return {
      isRejected: true,
      qualityScore,
      rejectionReason: `Quality score too low: ${qualityScore}`,
    };
  }

  return {
    isRejected: false,
    qualityScore,
    rejectionReason: null,
  };
}
