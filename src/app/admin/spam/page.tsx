"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { BlockedDomain, BlockedKeyword } from "@/types/database";
import { useState } from "react";

export default function AdminSpamPage() {
  const queryClient = useQueryClient();
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: "", reason: "" });
  const [newDomain, setNewDomain] = useState({ domain: "", reason: "" });

  const { data: keywords } = useQuery({
    queryKey: ["blocked-keywords"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase.from("blocked_keywords").select("*").order("keyword");
      return (data ?? []) as BlockedKeyword[];
    },
  });

  const { data: domains } = useQuery({
    queryKey: ["blocked-domains"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase.from("blocked_domains").select("*").order("domain");
      return (data ?? []) as BlockedDomain[];
    },
  });

  async function addKeyword() {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await supabase.from("blocked_keywords").insert(newKeyword);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["blocked-keywords"] });
    setKeywordOpen(false);
    setNewKeyword({ keyword: "", reason: "" });
    toast.success("Keyword added");
  }

  async function addDomain() {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await supabase.from("blocked_domains").insert(newDomain);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["blocked-domains"] });
    setDomainOpen(false);
    setNewDomain({ domain: "", reason: "" });
    toast.success("Domain added");
  }

  async function deleteKeyword(id: string) {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    await supabase.from("blocked_keywords").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["blocked-keywords"] });
    toast.success("Keyword removed");
  }

  async function deleteDomain(id: string) {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    await supabase.from("blocked_domains").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["blocked-domains"] });
    toast.success("Domain removed");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Spam Filters</h1>
        <p className="text-muted-foreground mt-1">
          Manage blocked keywords and domains
        </p>
      </div>

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Blocked Keywords</TabsTrigger>
          <TabsTrigger value="domains">Blocked Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blocked Keywords</CardTitle>
                <CardDescription>Posts containing these are rejected</CardDescription>
              </div>
              <Dialog open={keywordOpen} onOpenChange={setKeywordOpen}>
                <DialogTrigger>
                  <Button size="sm"><Plus className="mr-1 h-3 w-3" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Blocked Keyword</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Keyword</Label>
                      <Input value={newKeyword.keyword} onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input value={newKeyword.reason} onChange={(e) => setNewKeyword({ ...newKeyword, reason: e.target.value })} />
                    </div>
                    <Button onClick={addKeyword}>Add Keyword</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(keywords ?? []).map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">{kw.keyword}</span>
                      {kw.reason && <p className="text-sm text-muted-foreground">{kw.reason}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteKeyword(kw.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blocked Domains</CardTitle>
                <CardDescription>URLs from these domains are rejected</CardDescription>
              </div>
              <Dialog open={domainOpen} onOpenChange={setDomainOpen}>
                <DialogTrigger>
                  <Button size="sm"><Plus className="mr-1 h-3 w-3" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Blocked Domain</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Input value={newDomain.domain} onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })} placeholder="example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input value={newDomain.reason} onChange={(e) => setNewDomain({ ...newDomain, reason: e.target.value })} />
                    </div>
                    <Button onClick={addDomain}>Add Domain</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(domains ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium font-mono">{d.domain}</span>
                      {d.reason && <p className="text-sm text-muted-foreground">{d.reason}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteDomain(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
