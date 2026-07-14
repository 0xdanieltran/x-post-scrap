import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const jobFiltersSchema = z.object({
  search: z.string().optional(),
  technology: z.string().optional(),
  company: z.string().optional(),
  remote: z.coerce.boolean().optional(),
  country: z.string().optional(),
  seniority: z
    .enum([
      "intern",
      "junior",
      "mid",
      "senior",
      "lead",
      "staff",
      "principal",
      "unknown",
    ])
    .optional(),
  employment_type: z
    .enum([
      "full_time",
      "part_time",
      "contract",
      "internship",
      "freelance",
      "unknown",
    ])
    .optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  salary_min: z.coerce.number().optional(),
  sort: z.enum(["newest", "popular", "match", "salary"]).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const saveJobSchema = z.object({
  job_id: z.string().uuid(),
  status: z
    .enum(["saved", "applied", "interview", "offer", "rejected", "archived"])
    .default("saved"),
  notes: z.string().optional(),
});

export const updateSavedJobSchema = z.object({
  status: z
    .enum(["saved", "applied", "interview", "offer", "rejected", "archived"])
    .optional(),
  notes: z.string().optional(),
});

export const searchQuerySchema = z.object({
  name: z.string().min(1).max(100),
  query: z.string().min(1).max(512),
  enabled: z.boolean().default(true),
  interval_minutes: z.number().min(30).max(1440).default(60),
});

export const userPreferencesSchema = z.object({
  preferred_roles: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  preferred_locations: z.array(z.string()).default([]),
  preferred_countries: z.array(z.string()).default([]),
  preferred_seniority: z
    .array(
      z.enum([
        "intern",
        "junior",
        "mid",
        "senior",
        "lead",
        "staff",
        "principal",
        "unknown",
      ])
    )
    .default([]),
  remote_only: z.boolean().default(false),
  excluded_keywords: z.array(z.string()).default([]),
  min_salary: z.number().nullable().optional(),
});

export const notificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  frequency: z.enum(["instant", "daily", "weekly", "none"]),
  min_match_score: z.number().min(0).max(100),
});

export const blockedKeywordSchema = z.object({
  keyword: z.string().min(1).max(100),
  reason: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const blockedDomainSchema = z.object({
  domain: z.string().min(1).max(255),
  reason: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type JobFiltersInput = z.infer<typeof jobFiltersSchema>;
export type SaveJobInput = z.infer<typeof saveJobSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
