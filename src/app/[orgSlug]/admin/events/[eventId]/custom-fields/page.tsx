"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CustomField {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
}

const FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SELECT", label: "Dropdown" },
  { value: "BOOLEAN", label: "Yes/No" },
];

export default function CustomFieldsPage() {
  const { orgSlug, eventId } = useParams<{ orgSlug: string; eventId: string }>();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("TEXT");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  const base = `/api/org/${orgSlug}/events/${eventId}/custom-fields`;

  async function load() {
    const res = await fetch(base);
    if (res.ok) setFields(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const options =
      fieldType === "SELECT"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, type: fieldType, required, options }),
    });

    if (res.ok) {
      const created = await res.json();
      setFields((prev) => [...prev, created]);
      setLabel("");
      setFieldType("TEXT");
      setRequired(false);
      setOptionsText("");
      setOpen(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create field");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this field and all its responses?")) return;
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (res.ok) setFields((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Custom registration fields</h2>
          <p className="text-sm text-muted-foreground">
            Add extra questions shown during player registration.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add field</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add custom field</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. T-shirt size"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={fieldType} onValueChange={setFieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldType === "SELECT" && (
                <div className="space-y-1">
                  <Label>Options (one per line)</Label>
                  <textarea
                    className="w-full rounded-md border px-3 py-1.5 text-sm"
                    rows={4}
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder={"Small\nMedium\nLarge\nXL"}
                    required
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="required"
                  checked={required}
                  onCheckedChange={(v) => setRequired(v === true)}
                />
                <Label htmlFor="required" className="text-sm font-normal">
                  Required
                </Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add field"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom fields. Players will only see the standard registration form.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{f.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type}
                </Badge>
                {f.required && (
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                )}
                {f.type === "SELECT" && f.options && (
                  <span className="text-xs text-muted-foreground">
                    {(f.options as string[]).join(", ")}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(f.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
