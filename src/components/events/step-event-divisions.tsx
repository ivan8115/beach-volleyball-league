"use client";

import { useState } from "react";
import type { BracketType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface DivisionRow {
  id?: string; // existing division id (for edit mode)
  name: string;
  bracketType: BracketType;
  playoffTeams: number;
  switchToSingleElimAtSemifinals: boolean;
}

const defaultDivision = (): DivisionRow => ({
  name: "",
  bracketType: "SINGLE_ELIM",
  playoffTeams: 8,
  switchToSingleElimAtSemifinals: false,
});

interface StepEventDivisionsProps {
  initialDivisions?: DivisionRow[];
  onSubmit: (divisions: DivisionRow[]) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  mode: "create" | "edit";
}

export function StepEventDivisions({
  initialDivisions,
  onSubmit,
  onBack,
  isSubmitting,
  mode,
}: StepEventDivisionsProps) {
  const [divisions, setDivisions] = useState<DivisionRow[]>(
    initialDivisions?.length ? initialDivisions : [{ ...defaultDivision(), name: "Open" }],
  );
  const [errors, setErrors] = useState<string[]>([]);

  function update(index: number, patch: Partial<DivisionRow>) {
    setDivisions((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDivision() {
    setDivisions((prev) => [...prev, defaultDivision()]);
  }

  function removeDivision(index: number) {
    setDivisions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const errs: string[] = [];
    divisions.forEach((d, i) => {
      if (!d.name.trim()) errs.push(`Division ${i + 1} needs a name`);
    });
    if (divisions.length === 0) errs.push("At least one division is required");
    setErrors(errs);
    if (errs.length > 0) return;
    onSubmit(divisions);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Divisions</h3>
        <p className="text-sm text-muted-foreground">
          Configure the divisions for your event. At least one is required.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          {errors.map((e) => (
            <p key={e} className="text-sm text-destructive">{e}</p>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {divisions.map((division, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Division {index + 1}</span>
              {divisions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDivision(index)}
                  className="text-sm text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input
                  value={division.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="e.g. Open, Men's A, Coed"
                />
              </div>
              <div>
                <Label>Bracket type</Label>
                <Select
                  value={division.bracketType}
                  onValueChange={(v) =>
                    update(index, {
                      bracketType: v as BracketType,
                      switchToSingleElimAtSemifinals: false,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_ELIM">Single elimination</SelectItem>
                    <SelectItem value="DOUBLE_ELIM">Double elimination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Playoff teams</Label>
                <Input
                  type="number"
                  min={2}
                  value={division.playoffTeams}
                  onChange={(e) => update(index, { playoffTeams: Number(e.target.value) })}
                />
              </div>
            </div>
            {division.bracketType === "DOUBLE_ELIM" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`semis-${index}`}
                  checked={division.switchToSingleElimAtSemifinals}
                  onCheckedChange={(checked) =>
                    update(index, { switchToSingleElimAtSemifinals: !!checked })
                  }
                />
                <Label htmlFor={`semis-${index}`} className="cursor-pointer text-sm">
                  Switch to single elimination at semifinals
                </Label>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDivision} className="w-full">
        + Add division
      </Button>

      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
