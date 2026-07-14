import type { Job, JobMatchResult, UserPreferences } from "@/types/database";
import { MATCH_WEIGHTS } from "@/lib/constants/job-dictionaries";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function arrayOverlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  return a.filter((item) => setB.has(normalize(item)));
}

export function calculateJobMatch(
  job: Job,
  preferences: UserPreferences
): JobMatchResult {
  const reasons: string[] = [];
  let earnedWeight = 0;
  let totalWeight = 0;

  // Technology matching
  if (preferences.technologies.length > 0) {
    totalWeight += MATCH_WEIGHTS.technology;
    const matched = arrayOverlap(job.technologies, preferences.technologies);
    if (matched.length > 0) {
      const fraction = matched.length / preferences.technologies.length;
      earnedWeight += MATCH_WEIGHTS.technology * Math.min(fraction * 1.5, 1);
      matched.forEach((t) => reasons.push(`✔ ${t}`));
    }
  }

  // Role matching
  if (preferences.preferred_roles.length > 0 && job.title) {
    totalWeight += MATCH_WEIGHTS.role;
    const titleLower = normalize(job.title);
    const roleMatch = preferences.preferred_roles.some((role) =>
      titleLower.includes(normalize(role))
    );
    if (roleMatch) {
      earnedWeight += MATCH_WEIGHTS.role;
      reasons.push("✔ Preferred Role");
    }
  }

  // Remote preference
  if (preferences.remote_only) {
    totalWeight += MATCH_WEIGHTS.remote;
    if (job.remote) {
      earnedWeight += MATCH_WEIGHTS.remote;
      reasons.push("✔ Remote");
    }
  } else if (job.remote) {
    reasons.push("✔ Remote");
  }

  // Country matching
  if (preferences.preferred_countries.length > 0) {
    totalWeight += MATCH_WEIGHTS.country;
    if (
      job.country &&
      preferences.preferred_countries.some(
        (c) => normalize(c) === normalize(job.country!)
      )
    ) {
      earnedWeight += MATCH_WEIGHTS.country;
      reasons.push("✔ Preferred Country");
    }
  }

  // Seniority matching
  if (
    preferences.preferred_seniority.length > 0 &&
    job.seniority !== "unknown"
  ) {
    totalWeight += MATCH_WEIGHTS.seniority;
    if (preferences.preferred_seniority.includes(job.seniority)) {
      earnedWeight += MATCH_WEIGHTS.seniority;
      reasons.push(`✔ ${job.seniority} level`);
    }
  }

  // Salary matching
  if (preferences.min_salary && job.salary_max) {
    totalWeight += MATCH_WEIGHTS.salary;
    if (job.salary_max >= preferences.min_salary) {
      earnedWeight += MATCH_WEIGHTS.salary;
      reasons.push("✔ Meets salary expectation");
    }
  }

  // Excluded keywords penalty
  if (preferences.excluded_keywords.length > 0) {
    const desc = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
    const hasExcluded = preferences.excluded_keywords.some((kw) =>
      desc.includes(normalize(kw))
    );
    if (hasExcluded) {
      earnedWeight = Math.max(0, earnedWeight - 30);
      reasons.push("✗ Contains excluded keyword");
    }
  }

  const percentage =
    totalWeight > 0
      ? Math.round((earnedWeight / totalWeight) * 100)
      : reasons.length > 0
        ? 75
        : 50;

  return {
    score: earnedWeight,
    percentage: Math.min(100, percentage),
    reasons,
  };
}

export function sortByMatch(
  jobs: Job[],
  preferences: UserPreferences
): (Job & { match: JobMatchResult })[] {
  return jobs
    .map((job) => ({
      ...job,
      match: calculateJobMatch(job, preferences),
    }))
    .sort((a, b) => b.match.percentage - a.match.percentage);
}
