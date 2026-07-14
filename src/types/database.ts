export type UserRole = "user" | "admin";

export type SavedJobStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "freelance"
  | "unknown";

export type SeniorityLevel =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "staff"
  | "principal"
  | "unknown";

export type IngestionStatus = "running" | "completed" | "failed";

export type NotificationFrequency =
  | "instant"
  | "daily"
  | "weekly"
  | "none";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface XPost {
  id: string;
  tweet_id: string;
  author_id: string;
  username: string;
  display_name: string | null;
  text: string;
  url: string;
  language: string | null;
  hashtags: string[];
  metrics: Record<string, number>;
  media: unknown[];
  urls: string[];
  is_verified: boolean;
  raw_json: Record<string, unknown>;
  tweet_created_at: string;
  collected_at: string;
}

export interface Job {
  id: string;
  tweet_id: string;
  company: string | null;
  title: string | null;
  description: string | null;
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
  quality_score: number;
  rejection_reason: string | null;
  is_rejected: boolean;
  created_at: string;
  updated_at: string;
  x_post?: XPost;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  status: SavedJobStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_roles: string[];
  technologies: string[];
  preferred_locations: string[];
  preferred_countries: string[];
  preferred_seniority: SeniorityLevel[];
  remote_only: boolean;
  excluded_keywords: string[];
  min_salary: number | null;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  id: string;
  name: string;
  query: string;
  enabled: boolean;
  interval_minutes: number;
  last_run: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionRun {
  id: string;
  query_id: string | null;
  status: IngestionStatus;
  fetched_posts: number;
  imported_jobs: number;
  rejected_posts: number;
  duration_ms: number | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface BlockedKeyword {
  id: string;
  keyword: string;
  reason: string | null;
  enabled: boolean;
  created_at: string;
}

export interface BlockedDomain {
  id: string;
  domain: string;
  reason: string | null;
  enabled: boolean;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  frequency: NotificationFrequency;
  min_match_score: number;
  last_digest_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  query: string;
  filters: Record<string, unknown>;
  results_count: number;
  created_at: string;
}

export interface JobMatchResult {
  score: number;
  percentage: number;
  reasons: string[];
}

export interface JobFilters {
  search?: string;
  technology?: string;
  company?: string;
  remote?: boolean;
  country?: string;
  seniority?: SeniorityLevel;
  employment_type?: EmploymentType;
  date_from?: string;
  date_to?: string;
  salary_min?: number;
  sort?: "newest" | "popular" | "match" | "salary";
  cursor?: string;
  limit?: number;
}
