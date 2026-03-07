"use client";

import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { EventType } from "@/generated/prisma/enums";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Schema ──────────────────────────────────────────────────────────────────
// We use a flat schema (not discriminated union) so react-hook-form types work
// cleanly. Type-specific fields are optional in the schema; the UI conditionally
// shows them based on the `eventType` prop.

const formSchema = z.object({
  type: z.enum(["LEAGUE", "TOURNAMENT"]),
  name: z.string().min(1, "Name is required"),
  status: z.enum(["DRAFT", "REGISTRATION"]),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]),
  description: z.string().optional(),
  registrationDeadline: z.string().optional(),
  rosterLockDate: z.string().optional(),
  maxTeams: z.number().int().positive().optional(),
  minRosterSize: z.number().int().min(1),
  maxRosterSize: z.number().int().min(1),
  registrationFee: z.number().min(0).optional(),
  refundPolicy: z.enum(["NONE", "FULL", "PARTIAL"]),
  refundDeadline: z.string().optional(),
  seedingType: z.enum(["MANUAL", "RANDOM", "CUSTOM"]),
  startDate: z.string().optional(),
  maxSets: z.number().int().min(1).max(5),
  pointsToWinSet: z.number().int().min(1),
  pointsToWinDecider: z.number().int().min(1),
  // League-only
  weeks: z.number().int().min(1).optional(),
  collectAvailability: z.boolean().optional(),
  // Tournament-only
  endDate: z.string().optional(),
  bracketType: z.enum(["SINGLE_ELIM", "DOUBLE_ELIM"]).optional(),
  switchToSingleElimAtSemifinals: z.boolean().optional(),
  hasPoolPlay: z.boolean().optional(),
  teamsPerPool: z.number().int().positive().optional(),
  teamsAdvancingPerPool: z.number().int().positive().optional(),
  hasThirdPlaceMatch: z.boolean().optional(),
});

export type DetailsFormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepEventDetailsProps {
  eventType: EventType;
  initialValues?: Partial<DetailsFormValues>;
  onNext: (values: DetailsFormValues) => void;
  onBack: () => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StepEventDetails({ eventType, initialValues, onNext, onBack }: StepEventDetailsProps) {
  const defaultValues: DetailsFormValues = {
    type: eventType,
    name: "",
    status: "DRAFT",
    visibility: "PUBLIC",
    description: "",
    registrationDeadline: "",
    rosterLockDate: "",
    maxTeams: undefined,
    minRosterSize: 2,
    maxRosterSize: 4,
    registrationFee: undefined,
    refundPolicy: "NONE",
    refundDeadline: "",
    seedingType: "MANUAL",
    startDate: "",
    maxSets: 3,
    pointsToWinSet: 21,
    pointsToWinDecider: 15,
    // League defaults
    weeks: 6,
    collectAvailability: false,
    // Tournament defaults
    endDate: "",
    bracketType: "SINGLE_ELIM",
    switchToSingleElimAtSemifinals: false,
    hasPoolPlay: false,
    teamsPerPool: undefined,
    teamsAdvancingPerPool: undefined,
    hasThirdPlaceMatch: false,
    ...initialValues,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    // Cast resolver to avoid Zod v4 input-type mismatch with react-hook-form
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(formSchema) as Resolver<DetailsFormValues>,
    defaultValues,
  });

  const watchedRefundPolicy = watch("refundPolicy");
  const watchedHasPoolPlay = watch("hasPoolPlay");
  const watchedBracketType = watch("bracketType");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <input type="hidden" {...register("type")} value={eventType} />

      {/* Basic info */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Basic info</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Event name *</Label>
            <Input id="name" {...register("name")} placeholder="Summer Beach League 2026" />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={defaultValues.status}
              onValueChange={(v) => setValue("status", v as "DRAFT" | "REGISTRATION")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REGISTRATION">Registration open</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              defaultValue={defaultValues.visibility}
              onValueChange={(v) => setValue("visibility", v as "PUBLIC" | "UNLISTED" | "PRIVATE")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="UNLISTED">Unlisted</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            {...register("description")}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Tell players what this event is about..."
          />
        </div>
      </section>

      {/* Dates */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Dates</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
          </div>
          {eventType === "LEAGUE" && (
            <div>
              <Label htmlFor="weeks">Number of weeks *</Label>
              <Input id="weeks" type="number" min={1} {...register("weeks", { valueAsNumber: true })} />
              <FieldError message={errors.weeks?.message} />
            </div>
          )}
          {eventType === "TOURNAMENT" && (
            <div>
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          )}
          <div>
            <Label htmlFor="registrationDeadline">Registration deadline</Label>
            <Input id="registrationDeadline" type="datetime-local" {...register("registrationDeadline")} />
          </div>
          <div>
            <Label htmlFor="rosterLockDate">Roster lock date</Label>
            <Input id="rosterLockDate" type="datetime-local" {...register("rosterLockDate")} />
          </div>
        </div>
      </section>

      {/* Teams & rosters */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Teams &amp; rosters</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="maxTeams">Max teams</Label>
            <Input
              id="maxTeams"
              type="number"
              min={1}
              placeholder="Unlimited"
              {...register("maxTeams", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </div>
          <div>
            <Label htmlFor="minRosterSize">Min roster size *</Label>
            <Input id="minRosterSize" type="number" min={1} {...register("minRosterSize", { valueAsNumber: true })} />
            <FieldError message={errors.minRosterSize?.message} />
          </div>
          <div>
            <Label htmlFor="maxRosterSize">Max roster size *</Label>
            <Input id="maxRosterSize" type="number" min={1} {...register("maxRosterSize", { valueAsNumber: true })} />
            <FieldError message={errors.maxRosterSize?.message} />
          </div>
        </div>
      </section>

      {/* Registration & fees */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Registration &amp; fees</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="registrationFee">Registration fee (USD)</Label>
            <Input
              id="registrationFee"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              {...register("registrationFee", {
                setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </div>
          <div>
            <Label htmlFor="refundPolicy">Refund policy</Label>
            <Select
              defaultValue={defaultValues.refundPolicy}
              onValueChange={(v) => setValue("refundPolicy", v as "NONE" | "FULL" | "PARTIAL")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No refunds</SelectItem>
                <SelectItem value="FULL">Full refund</SelectItem>
                <SelectItem value="PARTIAL">Partial refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {watchedRefundPolicy !== "NONE" && (
            <div>
              <Label htmlFor="refundDeadline">Refund deadline</Label>
              <Input id="refundDeadline" type="datetime-local" {...register("refundDeadline")} />
            </div>
          )}
        </div>
      </section>

      {/* Game settings */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Game settings</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Max sets</Label>
            <Select
              defaultValue={String(defaultValues.maxSets)}
              onValueChange={(v) => setValue("maxSets", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pointsToWinSet">Points to win set</Label>
            <Input id="pointsToWinSet" type="number" min={1} {...register("pointsToWinSet", { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="pointsToWinDecider">Points to win decider</Label>
            <Input id="pointsToWinDecider" type="number" min={1} {...register("pointsToWinDecider", { valueAsNumber: true })} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Seeding</Label>
            <Select
              defaultValue={defaultValues.seedingType}
              onValueChange={(v) => setValue("seedingType", v as "MANUAL" | "RANDOM" | "CUSTOM")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="RANDOM">Random</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* League-only */}
      {eventType === "LEAGUE" && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold">League settings</h3>
          <div className="flex items-center gap-2">
            <Checkbox
              id="collectAvailability"
              defaultChecked={defaultValues.collectAvailability}
              onCheckedChange={(checked) => setValue("collectAvailability", !!checked)}
            />
            <Label htmlFor="collectAvailability" className="cursor-pointer">
              Collect player availability at registration
            </Label>
          </div>
        </section>
      )}

      {/* Tournament-only */}
      {eventType === "TOURNAMENT" && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Tournament settings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Bracket type</Label>
              <Select
                defaultValue={defaultValues.bracketType ?? "SINGLE_ELIM"}
                onValueChange={(v) => setValue("bracketType", v as "SINGLE_ELIM" | "DOUBLE_ELIM")}
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
          </div>
          <div className="flex flex-col gap-3">
            {watchedBracketType === "DOUBLE_ELIM" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="switchToSingleElimAtSemis"
                  defaultChecked={defaultValues.switchToSingleElimAtSemifinals}
                  onCheckedChange={(checked) => setValue("switchToSingleElimAtSemifinals", !!checked)}
                />
                <Label htmlFor="switchToSingleElimAtSemis" className="cursor-pointer">
                  Switch to single elimination at semifinals
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasThirdPlaceMatch"
                defaultChecked={defaultValues.hasThirdPlaceMatch}
                onCheckedChange={(checked) => setValue("hasThirdPlaceMatch", !!checked)}
              />
              <Label htmlFor="hasThirdPlaceMatch" className="cursor-pointer">
                Include third place match
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasPoolPlay"
                defaultChecked={defaultValues.hasPoolPlay}
                onCheckedChange={(checked) => setValue("hasPoolPlay", !!checked)}
              />
              <Label htmlFor="hasPoolPlay" className="cursor-pointer">
                Include pool play before bracket
              </Label>
            </div>
          </div>
          {watchedHasPoolPlay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamsPerPool">Teams per pool</Label>
                <Input
                  id="teamsPerPool"
                  type="number"
                  min={2}
                  {...register("teamsPerPool", {
                    setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
              </div>
              <div>
                <Label htmlFor="teamsAdvancingPerPool">Teams advancing per pool</Label>
                <Input
                  id="teamsAdvancingPerPool"
                  type="number"
                  min={1}
                  {...register("teamsAdvancingPerPool", {
                    setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
