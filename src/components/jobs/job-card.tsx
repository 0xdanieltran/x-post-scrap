"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  Bookmark,
  MapPin,
  Building2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import type { Job, JobMatchResult } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobCardProps {
  job: Job & { match?: JobMatchResult };
  isSaved?: boolean;
  onSave?: (jobId: string) => void;
}

export function JobCard({ job, isSaved, onSave }: JobCardProps) {
  const xPost = job.x_post;

  async function handleSave() {
    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Job saved!");
      onSave?.(job.id);
    } catch {
      toast.error("Failed to save job");
    }
  }

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {job.company && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.company}
                </span>
              )}
              {job.remote && (
                <Badge variant="secondary" className="text-xs">
                  Remote
                </Badge>
              )}
              {job.match && job.match.percentage >= 70 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className="text-xs bg-green-600">
                      {job.match.percentage}% Match
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ul className="text-xs space-y-1">
                      {job.match.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <h3 className="font-semibold text-lg leading-tight truncate">
              {job.title ?? "Untitled Position"}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {job.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.technologies.slice(0, 6).map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {job.technologies.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{job.technologies.length - 6}
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salary_min && job.salary_max
                ? `${job.currency ?? "$"}${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                : job.salary_min
                  ? `${job.currency ?? "$"}${job.salary_min.toLocaleString()}+`
                  : `Up to ${job.currency ?? "$"}${job.salary_max?.toLocaleString()}`}
            </span>
          )}
          <span>
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          variant={isSaved ? "secondary" : "outline"}
          size="sm"
          onClick={handleSave}
          disabled={isSaved}
        >
          <Bookmark className="mr-1.5 h-3.5 w-3.5" />
          {isSaved ? "Saved" : "Save"}
        </Button>
        {job.application_url && (
          <Button size="sm" asChild>
            <a href={job.application_url} target="_blank" rel="noopener noreferrer">
              Apply
            </a>
          </Button>
        )}
        {xPost?.url && (
          <Button variant="ghost" size="sm" asChild>
            <a href={xPost.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View on X
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
