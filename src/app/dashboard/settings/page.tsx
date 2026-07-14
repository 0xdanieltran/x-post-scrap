"use client";

import { useEffect, useState } from "react";
import { FieldValues, Resolver, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  userPreferencesSchema,
  notificationSettingsSchema,
  type UserPreferencesInput,
} from "@/lib/validations/schemas";
import { TECHNOLOGIES } from "@/lib/constants/job-dictionaries";
import { Badge } from "@/components/ui/badge";
import type { NotificationSettings, UserPreferences } from "@/types/database";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);

  const preferencesForm = useForm<UserPreferencesInput>({
    resolver: zodResolver(userPreferencesSchema) as Resolver<UserPreferencesInput>,
    defaultValues: {
      preferred_roles: [],
      technologies: [],
      preferred_locations: [],
      preferred_countries: [],
      preferred_seniority: [],
      remote_only: false,
      excluded_keywords: [],
    },
  });

  useEffect(() => {
    async function load() {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prefs }, { data: notifs }] = await Promise.all([
        supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
        supabase.from("notification_settings").select("*").eq("user_id", user.id).single(),
      ]);

      if (prefs) {
        preferencesForm.reset(prefs as UserPreferences);
        setSelectedTechs(prefs.technologies ?? []);
      }
      if (notifs) setNotificationSettings(notifs as NotificationSettings);
      setLoading(false);
    }
    load();
  }, [preferencesForm]);

  async function savePreferences(data: UserPreferencesInput) {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_preferences")
      .update({ ...data, technologies: selectedTechs })
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Preferences saved!");
  }

  async function saveNotifications() {
    if (!notificationSettings) return;
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const parsed = notificationSettingsSchema.safeParse(notificationSettings);
    if (!parsed.success) {
      toast.error("Invalid notification settings");
      return;
    }

    const { error } = await supabase
      .from("notification_settings")
      .update(parsed.data)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Notification settings saved!");
  }

  function toggleTech(tech: string) {
    setSelectedTechs((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your job preferences and notifications
        </p>
      </div>

      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-6">
          <form onSubmit={preferencesForm.handleSubmit(savePreferences as SubmitHandler<FieldValues>)}>
            <Card>
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
                <CardDescription>
                  Used for match scoring and job recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Preferred Roles (comma-separated)</Label>
                  <Input
                    placeholder="Software Engineer, Frontend Developer"
                    defaultValue={preferencesForm.getValues("preferred_roles").join(", ")}
                    onChange={(e) =>
                      preferencesForm.setValue(
                        "preferred_roles",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Technologies</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {TECHNOLOGIES.slice(0, 30).map((tech) => (
                      <Badge
                        key={tech}
                        variant={selectedTechs.includes(tech) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTech(tech)}
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Remote Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Only show remote positions
                    </p>
                  </div>
                  <Switch
                    checked={preferencesForm.watch("remote_only")}
                    onCheckedChange={(v) => preferencesForm.setValue("remote_only", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferred Countries (comma-separated)</Label>
                  <Input
                    placeholder="United States, Canada, Remote"
                    defaultValue={preferencesForm.getValues("preferred_countries").join(", ")}
                    onChange={(e) =>
                      preferencesForm.setValue(
                        "preferred_countries",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Excluded Keywords (comma-separated)</Label>
                  <Input
                    placeholder="crypto, nft, forex"
                    defaultValue={preferencesForm.getValues("excluded_keywords").join(", ")}
                    onChange={(e) =>
                      preferencesForm.setValue(
                        "excluded_keywords",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Get alerted when matching jobs are found
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive job alerts via email
                  </p>
                </div>
                <Switch
                  checked={notificationSettings?.email_enabled ?? true}
                  onCheckedChange={(v) =>
                    setNotificationSettings((s) =>
                      s ? { ...s, email_enabled: v } : s
                    )
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={notificationSettings?.frequency ?? "daily"}
                  onValueChange={(v) =>
                    setNotificationSettings((s) =>
                      s
                        ? {
                            ...s,
                            frequency: v as NotificationSettings["frequency"],
                          }
                        : s
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant alerts</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Match Score (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={notificationSettings?.min_match_score ?? 70}
                  onChange={(e) =>
                    setNotificationSettings((s) =>
                      s
                        ? { ...s, min_match_score: parseInt(e.target.value, 10) }
                        : s
                    )
                  }
                />
              </div>

              <Button onClick={saveNotifications}>
                <Save className="mr-2 h-4 w-4" />
                Save Notifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
