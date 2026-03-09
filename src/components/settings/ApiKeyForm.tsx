"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ApiKeyForm() {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setHasKey(data.hasKey);
      setMaskedKey(data.maskedKey);
    } catch {
      toast.error("Failed to load API key status");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!apiKey.startsWith("sk-ant-")) {
      toast.error("API key must start with sk-ant-");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to save API key");
        return;
      }

      setHasKey(true);
      setMaskedKey(data.maskedKey);
      setApiKey("");
      setShowKey(false);
      toast.success("API key saved successfully");
    } catch {
      toast.error("Failed to save API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove API key");
        return;
      }

      setHasKey(false);
      setMaskedKey(null);
      setApiKey("");
      toast.success("API key removed");
    } catch {
      toast.error("Failed to remove API key");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasKey && maskedKey && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Current key:</span>
          <code className="font-mono">{maskedKey}</code>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !apiKey.startsWith("sk-ant-")}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>

      {hasKey && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Remove API Key"
          )}
        </Button>
      )}
    </div>
  );
}
