import type { NormalizedTweet } from "@/services/x-api/client";
import type { EmploymentType, SeniorityLevel } from "@/types/database";
import {
  TECHNOLOGIES,
  TECH_ALIASES,
  SENIORITY_KEYWORDS,
  EMPLOYMENT_KEYWORDS,
  REMOTE_KEYWORDS,
  HYBRID_KEYWORDS,
  COUNTRY_CODES,
  COUNTRIES,
} from "@/lib/constants/job-dictionaries";

export interface ParsedJob {
  company: string | null;
  title: string | null;
  description: string;
  location: string | null;
  country: string | null;
  remote: boolean;
  employment_type: EmploymentType;
  seniority: SeniorityLevel;
  technologies: string[];
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  application_url: string | null;
  application_email: string | null;
  recruiter: string | null;
}

const TITLE_PATTERNS = [
  /(?:hiring|looking for|seeking|open(?:ing)?(?: role| position)?(?: for)?)[:\s]+(?:a\s+)?([A-Za-z0-9\s/\-&.]+?)(?:\s+(?:at|@|for|in|to)|$|[.!])/i,
  /(?:role|position)[:\s]+([A-Za-z0-9\s/\-&.]+?)(?:\s+(?:at|@|for|in)|$|[.!])/i,
  /([A-Za-z0-9\s/\-&.]+?\s+(?:engineer|developer|designer|manager|analyst|architect|devops|sre|qa|tester|lead|director))(?:\s+(?:at|@|for|in)|$|[.!])/i,
];

const COMPANY_PATTERNS = [
/(?:at|@)\s+([A-Za-z0-9\s&.\-']+?)(?:\s+(?:is|are|hiring|—|-|\||!|\.|,)|$)/i,
/(?:company|team|startup)[:\s]+([A-Za-z0-9\s&.\-']+?)(?:\s+(?:is|hiring)|$|[.!])/i,
];

const LOCATION_PATTERNS = [
/(?:location|based in|located in|office in)[:\s]+([A-Za-z0-9\s,.\-']+?)(?:\s+(?:\||!|\.|,|remote)|$)/i,
/(?:in|from)\s+([A-Za-z\s,.\-']{3,40})(?:\s+(?:area|region|office)|$|[.!])/i,
];

const SALARY_PATTERNS = [
/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:-|–|to)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
/(\d{1,3}(?:,\d{3})*)\s*(?:-|–|to)\s*(\d{1,3}(?:,\d{3})*)\s*(USD|EUR|GBP|CAD|AUD)/i,
/\$(\d{1,3}(?:,\d{3})*(?:k|K)?)\s*(?:\/\s*(?:yr|year|annually|month|mo))?/i,
/(\d{2,3})k\s*(?:-|–|to)\s*(\d{2,3})k/i,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]).slice(0, 120);
    }
  }
  return null;
}

function extractTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const tech of TECHNOLOGIES) {
    const pattern = new RegExp(
      `\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (pattern.test(text)) {
      found.add(tech);
    }
  }

  for (const [alias, canonical] of Object.entries(TECH_ALIASES)) {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) {
      found.add(canonical);
    }
  }

  const hashTags = text.match(/#(\w+)/g) ?? [];
  for (const tag of hashTags) {
    const clean = tag.slice(1).toLowerCase();
    if (TECH_ALIASES[clean]) found.add(TECH_ALIASES[clean]);
  }

  return Array.from(found);
}

function extractSeniority(text: string): SeniorityLevel {
  const lower = text.toLowerCase();
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return level as SeniorityLevel;
    }
  }
  return "unknown";
}

function extractEmploymentType(text: string): EmploymentType {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(EMPLOYMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return type as EmploymentType;
    }
  }
  return "unknown";
}

function extractRemote(text: string): boolean {
  const lower = text.toLowerCase();
  if (REMOTE_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  if (HYBRID_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return lower.includes("remote");
}

function extractCountry(text: string, location: string | null): string | null {
  const combined = `${text} ${location ?? ""}`.toLowerCase();

  for (const country of COUNTRIES) {
    if (combined.includes(country.toLowerCase())) {
      return country === "USA" || country === "US" ? "United States" : country;
    }
  }

  for (const [code, name] of Object.entries(COUNTRY_CODES)) {
    const pattern = new RegExp(`\\b${code}\\b`, "i");
    if (pattern.test(combined)) return name;
  }

  return null;
}

function parseSalary(text: string): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[3]) {
      const min = parseInt(match[1].replace(/,/g, ""), 10);
      const max = parseInt(match[2].replace(/,/g, ""), 10);
      return { min, max, currency: match[3].toUpperCase() };
    }

    if (match[2]) {
      let min = parseFloat(match[1].replace(/,/g, "").replace(/k/i, ""));
      let max = parseFloat(match[2].replace(/,/g, "").replace(/k/i, ""));
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
      return { min, max, currency: "USD" };
    }

    if (match[1]) {
      let val = parseFloat(match[1].replace(/,/g, "").replace(/k/i, ""));
      if (val < 1000) val *= 1000;
      return { min: val, max: null, currency: "USD" };
    }
  }

  return { min: null, max: null, currency: null };
}

function extractApplicationUrl(text: string, urls: string[]): string | null {
  const applyPatterns = /apply|careers|jobs|greenhouse|lever|workday|ashby/i;

  for (const url of urls) {
    if (applyPatterns.test(url)) return url;
  }

  const urlMatches = text.match(URL_PATTERN) ?? [];
  for (const url of urlMatches) {
    if (applyPatterns.test(url)) return url;
  }

  return urls[0] ?? null;
}

function extractEmail(text: string): string | null {
  const matches = text.match(EMAIL_PATTERN);
  if (!matches) return null;
  const filtered = matches.filter(
    (e) => !e.endsWith(".png") && !e.endsWith(".jpg")
  );
  return filtered[0] ?? null;
}

function extractRecruiter(tweet: NormalizedTweet): string | null {
  if (tweet.display_name && tweet.display_name !== "Unknown") {
    return `@${tweet.username} (${tweet.display_name})`;
  }
  return `@${tweet.username}`;
}

export function parseJobFromTweet(tweet: NormalizedTweet): ParsedJob {
  const text = normalizeText(tweet.text);
  const title = extractFirstMatch(text, TITLE_PATTERNS);
  const company = extractFirstMatch(text, COMPANY_PATTERNS);
  const location = extractFirstMatch(text, LOCATION_PATTERNS);
  const remote = extractRemote(text);
  const { min, max, currency } = parseSalary(text);

  return {
    company,
    title,
    description: text,
    location: remote && !location ? "Remote" : location,
    country: extractCountry(text, location),
    remote,
    employment_type: extractEmploymentType(text),
    seniority: extractSeniority(text),
    technologies: extractTechnologies(text),
    salary_min: min,
    salary_max: max,
    currency,
    application_url: extractApplicationUrl(text, tweet.urls),
    application_email: extractEmail(text),
    recruiter: extractRecruiter(tweet),
  };
}
