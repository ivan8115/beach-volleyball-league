"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CustomField {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
}

interface CustomFieldsFormProps {
  orgSlug: string;
  eventId: string;
  /** Called with field responses once the user finishes. */
  onComplete: () => void;
  /** Called if there are no custom fields (skip this step). */
  onSkip: () => void;
}

export function CustomFieldsForm({ orgSlug, eventId, onComplete, onSkip }: CustomFieldsFormProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/events/${eventId}/custom-fields`)
      .then((r) => r.json())
      .then((data: CustomField[]) => {
        if (data.length === 0) {
          onSkip();
          return;
        }
        setFields(data);
        // Initialize values
        const init: Record<string, string> = {};
        for (const f of data) {
          init[f.id] = f.type === "BOOLEAN" ? "false" : "";
        }
        setValues(init);
        setLoading(false);
      });
  }, [orgSlug, eventId, onSkip]);

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const responses = Object.entries(values)
      .filter(([, v]) => v.trim() !== "")
      .map(([fieldId, value]) => ({ fieldId, value }));

    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/custom-fields/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses }),
    });

    if (res.ok) {
      onComplete();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit");
    }
    setSubmitting(false);
  }

  if (loading) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {field.type === "TEXT" && (
            <Input
              value={values[field.id] ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === "NUMBER" && (
            <Input
              type="number"
              value={values[field.id] ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === "SELECT" && field.options && (
            <select
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={values[field.id] ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
              required={field.required}
            >
              <option value="">Select...</option>
              {(field.options as string[]).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {field.type === "BOOLEAN" && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={values[field.id] === "true"}
                onCheckedChange={(v) => setValue(field.id, v ? "true" : "false")}
              />
              <span className="text-sm">Yes</span>
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Continue"}
      </button>
    </form>
  );
}
