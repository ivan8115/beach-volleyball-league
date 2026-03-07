"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/generated/prisma/enums";
import { WizardStepIndicator } from "./wizard-step-indicator";
import { StepEventType } from "./step-event-type";
import { StepEventDetails, type DetailsFormValues } from "./step-event-details";
import { StepEventDivisions, type DivisionRow } from "./step-event-divisions";

const STEPS = [
  { label: "Event type" },
  { label: "Details" },
  { label: "Divisions" },
];

// ─── Serialized event shape passed from server component (edit mode) ──────────

export interface EventInitialData {
  type: EventType;
  name: string;
  status: "DRAFT" | "REGISTRATION";
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  description?: string | null;
  registrationDeadline?: string | null;
  rosterLockDate?: string | null;
  maxTeams?: number | null;
  minRosterSize: number;
  maxRosterSize: number;
  registrationFee?: number | null;
  refundPolicy: "NONE" | "FULL" | "PARTIAL";
  refundDeadline?: string | null;
  seedingType: "MANUAL" | "RANDOM" | "CUSTOM";
  startDate?: string | null;
  // League
  weeks?: number | null;
  collectAvailability?: boolean;
  maxSets?: number;
  pointsToWinSet?: number;
  pointsToWinDecider?: number;
  // Tournament
  endDate?: string | null;
  bracketType?: "SINGLE_ELIM" | "DOUBLE_ELIM";
  switchToSingleElimAtSemifinals?: boolean;
  hasPoolPlay?: boolean;
  teamsPerPool?: number | null;
  teamsAdvancingPerPool?: number | null;
  hasThirdPlaceMatch?: boolean;
  divisions: DivisionRow[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventWizardProps {
  orgSlug: string;
  mode: "create" | "edit";
  eventId?: string;
  initialData?: EventInitialData;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventWizard({ orgSlug, mode, eventId, initialData }: EventWizardProps) {
  const router = useRouter();

  // In edit mode, skip step 0 (type is fixed)
  const [step, setStep] = useState(mode === "edit" ? 1 : 0);
  const [eventType, setEventType] = useState<EventType>(initialData?.type ?? "LEAGUE");
  const [detailsData, setDetailsData] = useState<DetailsFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Convert initialData to DetailsFormValues shape for pre-filling step 2
  const initialDetailsValues: Partial<DetailsFormValues> | undefined = initialData
    ? {
        type: initialData.type,
        name: initialData.name,
        status: initialData.status,
        visibility: initialData.visibility,
        description: initialData.description ?? "",
        registrationDeadline: initialData.registrationDeadline ?? "",
        rosterLockDate: initialData.rosterLockDate ?? "",
        maxTeams: initialData.maxTeams ?? undefined,
        minRosterSize: initialData.minRosterSize,
        maxRosterSize: initialData.maxRosterSize,
        registrationFee: initialData.registrationFee ?? undefined,
        refundPolicy: initialData.refundPolicy,
        refundDeadline: initialData.refundDeadline ?? "",
        seedingType: initialData.seedingType,
        startDate: initialData.startDate ?? "",
        maxSets: initialData.maxSets ?? 3,
        pointsToWinSet: initialData.pointsToWinSet ?? 21,
        pointsToWinDecider: initialData.pointsToWinDecider ?? 15,
        weeks: initialData.weeks ?? 6,
        collectAvailability: initialData.collectAvailability ?? false,
        endDate: initialData.endDate ?? "",
        bracketType: initialData.bracketType ?? "SINGLE_ELIM",
        switchToSingleElimAtSemifinals: initialData.switchToSingleElimAtSemifinals ?? false,
        hasPoolPlay: initialData.hasPoolPlay ?? false,
        teamsPerPool: initialData.teamsPerPool ?? undefined,
        teamsAdvancingPerPool: initialData.teamsAdvancingPerPool ?? undefined,
        hasThirdPlaceMatch: initialData.hasThirdPlaceMatch ?? false,
      }
    : undefined;

  // ── Step handlers ────────────────────────────────────────────────────────

  function handleTypeSelect(type: EventType) {
    setEventType(type);
    setStep(1);
  }

  function handleDetailsNext(values: DetailsFormValues) {
    setDetailsData(values);
    setStep(2);
  }

  async function handleDivisionsSubmit(divisions: DivisionRow[]) {
    if (!detailsData) return;
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      ...detailsData,
      type: eventType,
      maxTeams: detailsData.maxTeams ?? null,
      registrationFee: detailsData.registrationFee ?? null,
      teamsPerPool: detailsData.teamsPerPool ?? null,
      teamsAdvancingPerPool: detailsData.teamsAdvancingPerPool ?? null,
      divisions,
    };

    const url =
      mode === "create"
        ? `/api/org/${orgSlug}/events`
        : `/api/org/${orgSlug}/events/${eventId}`;

    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "create") {
      const data = await res.json();
      router.push(`/${orgSlug}/admin/events?created=${data.id}`);
    } else {
      router.push(`/${orgSlug}/admin/events`);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const currentStepForIndicator = mode === "edit" ? step : step;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <WizardStepIndicator steps={STEPS} currentStep={currentStepForIndicator} />
        <Link
          href={`/${orgSlug}/admin/events`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>

      {serverError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {step === 0 && <StepEventType onSelect={handleTypeSelect} />}

      {step === 1 && (
        <StepEventDetails
          eventType={eventType}
          initialValues={initialDetailsValues}
          onNext={handleDetailsNext}
          onBack={() => (mode === "edit" ? undefined : setStep(0))}
        />
      )}

      {step === 2 && (
        <StepEventDivisions
          initialDivisions={initialData?.divisions}
          onSubmit={handleDivisionsSubmit}
          onBack={() => setStep(1)}
          isSubmitting={isSubmitting}
          mode={mode}
        />
      )}
    </div>
  );
}
